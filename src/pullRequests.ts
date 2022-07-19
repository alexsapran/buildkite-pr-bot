import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { parseComment } from './lib/parseComment';
import { PrConfig } from './models/prConfig';
import PullRequestEventContext, { PullRequestEventTriggerType } from './models/pullRequestEventContext';
import Buildkite from './buildkite';
import getConfigs from './config';
import getFileFromRepo from './lib/getFileFromRepo';
import { BuildkiteIngestData } from './buildkiteIngestData';

export default class PullRequests {
  github: Octokit;
  buildkite: Buildkite;
  buildkiteIngestData: BuildkiteIngestData;

  constructor(github: Octokit, buildkite: Buildkite, buildkiteIngestData: BuildkiteIngestData) {
    this.github = github;
    this.buildkite = buildkite;
    this.buildkiteIngestData = buildkiteIngestData;
  }

  getCommitsForBuildCompare = async (context: PullRequestEventContext, baseCommitsCount: number) => {
    const commits = (
      await this.github.repos.listCommits({
        owner: context.owner,
        repo: context.repo,
        sha: context.pullRequest.head.sha,
        per_page: 100,
      })
    ).data;

    const baseCommitIndex = commits.findIndex((commit) => commit.sha === context.pullRequest.base.sha);
    // Only look up to 10 commits back from the base commit
    let commitsToSearch = commits.slice(Math.max(baseCommitIndex - (baseCommitsCount - 1), 0));
    if (commitsToSearch.length > 20) {
      // If there's more than 20 commits, then just select 10ish from the base commit, and 10 from the head of the PR (delete everything in the middle)
      commitsToSearch.splice(10, commitsToSearch.length - 20);
    }

    return commitsToSearch.map((commit) => commit.sha);
  };

  getPossibleReusableBuildJob = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const commits = await this.getCommitsForBuildCompare(context, 10);
    const buildJobs = await this.buildkiteIngestData.getBuildJobsForCommits(commits, prConfig.kibana_build_reuse_pipeline_slugs);
    const lastGreenJob = buildJobs.find((job) => job.state === 'passed');

    if (!lastGreenJob) {
      return null;
    }

    const resp = await this.github.repos.compareCommitsWithBasehead({
      owner: context.owner,
      repo: context.repo,
      basehead: `${lastGreenJob.build.commit}...${context.pullRequest.head.sha}`,
    });

    const skipRegexes = [...prConfig.skip_ci_on_only_changed, ...prConfig.kibana_build_reuse_regexes].map(
      (regex) => new RegExp(regex, 'i')
    );
    const requiredRegexes = prConfig.always_require_ci_on_changed?.map((regex) => new RegExp(regex, 'i'));

    if (this.areChangesSkippable(skipRegexes, requiredRegexes, (resp.data as any).files)) {
      return lastGreenJob;
    }
  };

  triggerBuildkiteBuild = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const { pullRequest, parsedComment } = context;
    const targetBranch = pullRequest.base.ref;

    context.log(`Triggering pipeline '${prConfig.pipelineSlug}' against ${targetBranch}...`);

    const labels = (pullRequest.labels || []).map((label) => label.name).join(',');

    const buildParams = {
      GITHUB_PR_NUMBER: pullRequest.number.toString(),
      GITHUB_PR_TARGET_BRANCH: targetBranch,
      GITHUB_PR_BASE_OWNER: pullRequest.base.repo.owner.login,
      GITHUB_PR_BASE_REPO: pullRequest.base.repo.name,
      GITHUB_PR_OWNER: pullRequest.head.repo.owner.login,
      GITHUB_PR_REPO: pullRequest.head.repo.name,
      GITHUB_PR_BRANCH: pullRequest.head.ref,
      GITHUB_PR_TRIGGERED_SHA: pullRequest.head.sha,
      GITHUB_PR_LABELS: labels,
    };

    if (parsedComment?.match) {
      buildParams['GITHUB_PR_TRIGGER_COMMENT'] = parsedComment.comment;

      if (parsedComment.groups) {
        for (const [key, value] of Object.entries(parsedComment.groups)) {
          const cleanKey = key.replace(/[^a-zA-Z_]/gi, '').toUpperCase();
          buildParams[`GITHUB_PR_COMMENT_VAR_${cleanKey}`] = value;
        }
      }
    }

    if (prConfig.kibana_build_reuse) {
      if (!prConfig.kibana_build_reuse_label || pullRequest.labels.some((l) => l.name === prConfig.kibana_build_reuse_label)) {
        const reusableBuild = await this.getPossibleReusableBuildJob(prConfig, context);
        if (reusableBuild) {
          buildParams['KIBANA_BUILD_ID'] = reusableBuild.build.id;
        }
      }
    }

    try {
      const status = await this.buildkite.triggerBuild(prConfig.pipelineSlug, {
        branch: `${pullRequest.head.repo.owner.login}:${pullRequest.head.ref}`,
        commit: pullRequest.head.sha,
        pull_request_base_branch: targetBranch,
        pull_request_id: pullRequest.number,
        pull_request_repository: pullRequest.head.repo.git_url, // TODO clone_url?
        env: buildParams,
      });

      context.log(`Triggered build #${status.number} - ${status.web_url}`);

      return status;
    } catch (ex) {
      console.error(ex);
      throw ex;
    }
  };

  // This was adapted from kibana-buildkite-library
  areChangesSkippable = (
    skippablePaths: RegExp[],
    requiredPaths: RegExp[] = [],
    prChanges: null | RestEndpointMethodTypes['pulls']['listFiles']['response']['data'] = null
  ) => {
    if (requiredPaths?.length) {
      const someFilesMatchRequired = requiredPaths.some((path) =>
        prChanges.some((change) => change.filename.match(path) || change.previous_filename?.match(path))
      );

      if (someFilesMatchRequired) {
        return false;
      }
    }

    const someFilesNotSkippable = prChanges.some(
      (change) =>
        !skippablePaths.some((path) => change.filename.match(path) && (!change.previous_filename || change.previous_filename.match(path)))
    );

    return !someFilesNotSkippable;
  };

  shouldSkipCi = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const { pullRequest } = context;

    if (context.type === PullRequestEventTriggerType.Create || context.type === PullRequestEventTriggerType.Update) {
      if (prConfig.skip_ci_on_only_changed?.length > 0 && pullRequest.changed_files < 1000) {
        const skipRegexes = prConfig.skip_ci_on_only_changed.map((regex) => new RegExp(regex, 'i'));
        const requiredRegexes = prConfig.always_require_ci_on_changed?.map((regex) => new RegExp(regex, 'i'));

        // Check only files that have changed since the last green build. If the changed files don't require CI, we can skip
        if (prConfig.skippable_changes_beta_label && pullRequest.labels.some((l) => l.name === prConfig.skippable_changes_beta_label)) {
          const commits = await this.getCommitsForBuildCompare(context, 0);
          const buildJobs = await this.buildkiteIngestData.getBuildJobsForCommits(commits, prConfig.kibana_build_reuse_pipeline_slugs);
          const lastGreenJob = buildJobs.find((job) => job.state === 'passed');

          // If there's no green build for this PR so far, we should check all files in the PR
          const commitForCompare = lastGreenJob ? lastGreenJob.build.commit : pullRequest.base.sha;
          const resp = await this.github.repos.compareCommitsWithBasehead({
            owner: context.owner,
            repo: context.repo,
            basehead: `${commitForCompare}...${context.pullRequest.head.sha}`,
          });

          return this.areChangesSkippable(skipRegexes, requiredRegexes, resp.data.files ?? []);
        }

        const changedFiles = await this.github.paginate(this.github.pulls.listFiles, {
          owner: context.owner,
          repo: context.repo,
          pull_number: pullRequest.number,
          per_page: 100,
        });

        return this.areChangesSkippable(skipRegexes, requiredRegexes, changedFiles);
      }
    }

    return false;
  };

  triggerBuildOrSkipCi = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const shouldSkipCi = await this.shouldSkipCi(prConfig, context);
    if (shouldSkipCi) {
      context.log('Skipping CI because all changed files matched skipCiOnOnlyChanged regexes');
      if (prConfig.set_commit_status) {
        await this.github.repos.createCommitStatus({
          owner: context.owner,
          repo: context.repo,
          sha: context.pullRequest.head.sha,
          state: 'success',
          description: 'No changes required CI. Skipped.',
          context: prConfig.commit_status_context,
        });
      }

      return;
    }

    const skippedForOldBranch = await this.maybeSkipForOldBranch(prConfig, context);
    if (skippedForOldBranch) {
      return;
    }

    await this.triggerBuildkiteBuild(prConfig, context);
  };

  maybeSkipForOldBranch = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const targetBranch = context.pullRequest.base.ref;
    if (prConfig.kibana_versions_check && targetBranch.match(/^[0-9]+\.[0-9]+$/)) {
      const versionsJson = await getFileFromRepo(this.github, context.owner, context.repo, 'main', 'versions.json');
      const { versions } = JSON.parse(versionsJson);
      if (!versions.some((version) => version.branch === targetBranch)) {
        context.log(`Skipping CI because branch ${targetBranch} is not in versions.json`);

        const commentBody = [
          `CI was triggered for this PR, but this PR targets ${targetBranch} which should not receive a future release. CI is not supported for these branches. Please consult the release schedule, or contact \`#kibana-operations\` if you believe this is an error.`,
          '',
          'The following branches are currently considered to be open:',
          ...versions.map((version) => `* ${version.branch}`),
        ];

        await this.github.issues.createComment({
          owner: context.owner,
          repo: context.repo,
          issue_number: context.pullRequest.number,
          body: commentBody.join('\n'),
        });
        return true;
      }
    }

    return false;
  };

  triggerBuild = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const buildStatus = await this.triggerBuildkiteBuild(prConfig, context);

    if (prConfig.set_commit_status && prConfig.commit_status_context) {
      try {
        await this.github.repos.createCommitStatus({
          target_url: buildStatus.web_url,
          owner: context.owner,
          repo: context.repo,
          sha: context.pullRequest.head.sha,
          state: 'pending',
          context: prConfig.commit_status_context,
          description: 'Job queued',
        });
      } catch (ex) {
        context.error('Error while trying to create commit status', ex);
      }
    }
  };

  parseAndSetComment = (context: PullRequestEventContext, regex: string) => {
    const parsedComment = parseComment(regex, context.comment.body);

    if (parsedComment.match) {
      context.parsedComment = parsedComment;
      return true;
    }

    return false;
  };

  // These are checks that all triggered jobs have to pass, no matter the context of the trigger
  // User permission checks are the exception. These are handled last, because they require additional API calls
  checkStrictTriggerReqs = (prConfig: PrConfig, context: PullRequestEventContext) => {
    if (!prConfig.enabled) {
      return false;
    }

    if (prConfig.target_branch && prConfig.target_branch !== context.pullRequest.base.ref) {
      return false;
    }

    if (prConfig.skip_target_branches?.length && prConfig.skip_target_branches.includes(context.pullRequest.base.ref)) {
      return false;
    }

    // If the skip-ci label is present, skip the trigger unless it came from a comment
    if (context.type !== PullRequestEventTriggerType.Comment && prConfig.skip_ci_labels.length && context.pullRequest.labels?.length) {
      const prLabels = context.pullRequest.labels.map((l) => l.name);

      for (const skipCiLabel of prConfig.skip_ci_labels) {
        if (prLabels.includes(skipCiLabel)) {
          context.log(`Skipping '${prConfig.pipelineSlug}' because skip label '${prConfig.skip_ci_label}' is present`);

          return false;
        }
      }
    }

    return true;
  };

  // These are checks for "general" triggers, e.g. a PR being opened or a comment of something like "buildkite build this"
  checkGeneralTrigger = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    // If this job has required labels, any "general" trigger should only trigger if one of the labels matches up
    if (prConfig.labels) {
      const prLabels = context.pullRequest.labels.map((l) => l.name);

      if (!prConfig.labels.find((requiredLabel) => prLabels.includes(requiredLabel))) {
        return false;
      }
    }

    // If this trigger was from a label event, the added label must match up
    if (context.type === PullRequestEventTriggerType.Label) {
      return context.label && prConfig.labels?.includes(context.label);
    }

    // If this trigger was from a comment, the comment must match the trigger regex
    if (context.type === PullRequestEventTriggerType.Comment) {
      // console.log(`Got comment trigger by ${payload.comment.user.login} on pull request #${payload.issue.number} for job ${prJob.id}`);
      return (
        context.comment &&
        prConfig.build_on_comment &&
        prConfig.trigger_comment_regex &&
        this.parseAndSetComment(context, prConfig.trigger_comment_regex)
      );
    }

    // If this trigger was from a commit or initial PR creation, and the above checks didn't fail, we should trigger a build
    if (context.type === PullRequestEventTriggerType.Create || context.type === PullRequestEventTriggerType.Update) {
      return prConfig.build_on_commit;
    }

    return false;
  };

  // These checks are for the comment trigger that would override other checks.
  // e.g. you have a job that normally requires a label of "Feature:CoolFeature"
  //  but you also want to run the job on-demand with a comment like "buildkite run CoolFeature ci"
  checkCommentAlwaysTrigger = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    if (!context.comment || !prConfig.always_trigger_comment_regex) {
      return false;
    }

    return this.parseAndSetComment(context, prConfig.always_trigger_comment_regex);
  };

  checkUserCanTrigger = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const { owner, repo, pullRequest } = context;
    const user = context.comment?.user?.login || pullRequest.user.login;

    if (prConfig.allowed_list && prConfig.allowed_list.includes(user)) {
      context.log(`User ${pullRequest.user.login} on allowed list`);
      return true;
    }

    if (prConfig.allowed_repo_permissions?.length) {
      try {
        const resp = await this.github.repos.getCollaboratorPermissionLevel({
          owner: owner,
          repo: repo,
          username: user,
        });

        if (prConfig.allowed_repo_permissions.includes(resp.data.permission)) {
          return true;
        }
      } catch (ex) {
        context.error(`${ex.toString()}: ${ex.status}`);
      }
    }

    if (prConfig.allow_org_users) {
      try {
        const resp = (await this.github.orgs.checkMembershipForUser({
          org: 'elastic',
          username: user,
        })) as any;

        if (resp?.status === 204) {
          return true;
        }
      } catch (ex) {
        context.error(`${ex.toString()}: ${ex.status}`);
      }
    }

    context.log(`Ignoring pull request from user '${user}' - user must be a member of elastic or have repo write privileges`);
    return false;
  };

  handleContext = async (context: PullRequestEventContext) => {
    if (context.pullRequest.state !== 'open') {
      context.log(`Ignoring PR in state '${context.pullRequest.state}'`);
      return;
    }

    context.log('Handling trigger event');

    const jobs = await getConfigs(context.owner, context.repo, this.github);
    const jobsToHandle = jobs.filter((job) => this.checkStrictTriggerReqs(job, context));

    for (const job of jobsToHandle) {
      try {
        if ((await this.checkGeneralTrigger(job, context)) || (await this.checkCommentAlwaysTrigger(job, context))) {
          if (await this.checkUserCanTrigger(job, context)) {
            await this.triggerBuildOrSkipCi(job, context);
          }
        }
      } catch (ex) {
        context.error(ex);
      }
    }
  };
}
