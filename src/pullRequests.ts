import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { parseComment } from './lib/parseComment';
import { PrConfig } from './models/prConfig';
import PullRequestEventContext, { PullRequestEventTriggerType } from './models/pullRequestEventContext';
import Buildkite, { BuildkiteBuild, BuildkiteTriggerBuildParams } from './buildkite';
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
    if (context.pullRequest.commits >= 100) {
      return null;
    }

    let commitsToSearch;

    const prCommits = (
      await this.github.pulls.listCommits({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullRequest.number,
        per_page: 100,
      })
    ).data.reverse();

    if (baseCommitsCount > 0) {
      const commits = (
        await this.github.repos.listCommits({
          owner: context.owner,
          repo: context.repo,
          sha: context.pullRequest.head.sha,
          per_page: 100,
        })
      ).data;

      const baseCommits = commits.filter((commit) => !prCommits.some((prCommit) => prCommit.sha === commit.sha));
      commitsToSearch = [...prCommits.slice(0, 10), ...baseCommits.slice(0, Math.min(baseCommitsCount, 10))];
    } else {
      commitsToSearch = prCommits.slice(0, 20);
    }

    return commitsToSearch.map((commit) => commit.sha);
  };

  getPossibleReusableBuildJob = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const commits = await this.getCommitsForBuildCompare(context, 10);
    if (!commits?.length) {
      return null;
    }

    const buildJobs = await this.buildkiteIngestData.getBuildJobsForCommits(commits, prConfig.kibana_build_reuse_pipeline_slugs, 'passed');
    const lastGreenJob = buildJobs.find((job) => job.state === 'passed');

    if (!lastGreenJob) {
      return null;
    }

    const resp = await this.github.repos.compareCommitsWithBasehead({
      owner: context.owner,
      repo: context.repo,
      basehead: `${lastGreenJob.build.commit}...${context.pullRequest.head.sha}`,
    });
    const { files } = resp.data as any;

    // The API only returns up to 300 files. To get the full list in this case, you have to ask github for the full diff in diff format.
    // This diff could be huge, so let's just assume that if there are over 300 files in the diff, it's pretty unlikely to be skippable.
    if (files.length >= 300) {
      return null;
    }

    const skipRegexes = [...prConfig.skip_ci_on_only_changed, ...prConfig.kibana_build_reuse_regexes].map(
      (regex) => new RegExp(regex, 'i')
    );
    const requiredRegexes = prConfig.always_require_ci_on_changed?.map((regex) => new RegExp(regex, 'i'));

    if (this.areChangesSkippable(skipRegexes, requiredRegexes, files)) {
      return lastGreenJob;
    }
  };

  notifyCommitNotMergeable = async (context: PullRequestEventContext) => {
    const { pullRequest } = context;

    const commentBody = `:warning: This pull request is not mergeable, CI is not able to run.`;

    try {
      // Delete any existing comments from this bot
      const comments = (
        await this.github.issues.listComments({
          owner: context.owner,
          repo: context.repo,
          issue_number: pullRequest.number,
        })
      ).data;

      for (const comment of comments) {
        if (comment.body === commentBody) {
          await this.github.issues.deleteComment({
            owner: context.owner,
            repo: context.repo,
            comment_id: comment.id,
          });
        }
      }
    } catch (ex) {
      context.error(`Failed to add comment to PR #${pullRequest.number}: ${ex.message}`);
    }

    await this.github.issues.createComment({
      owner: context.owner,
      repo: context.repo,
      issue_number: pullRequest.number,
      body: commentBody,
    });
  };

  triggerBuildkiteBuild = async (prConfig: PrConfig, context: PullRequestEventContext) => {
    const { pullRequest, parsedComment } = context;
    const targetBranch = pullRequest.base.ref;

    context.log(`Triggering pipeline '${prConfig.pipeline_slug}' against ${prConfig.always_trigger_branch || targetBranch}...`);

    const commitToBuild =
      prConfig.use_merge_commit && pullRequest.mergeable && pullRequest.merge_commit_sha
        ? pullRequest.merge_commit_sha
        : pullRequest.head.sha;

    const labels = (pullRequest.labels || []).map((label) => label.name).join(',');

    const buildParams = {
      GITHUB_PR_NUMBER: pullRequest.number.toString(),
      GITHUB_PR_TARGET_BRANCH: targetBranch,
      GITHUB_PR_BASE_OWNER: pullRequest.base.repo.owner.login,
      GITHUB_PR_BASE_REPO: pullRequest.base.repo.name,
      GITHUB_PR_OWNER: pullRequest.head.repo.owner.login,
      GITHUB_PR_REPO: pullRequest.head.repo.name,
      GITHUB_PR_BRANCH: pullRequest.head.ref,
      GITHUB_PR_USER: pullRequest.user.login,
      GITHUB_PR_HEAD_SHA: pullRequest.head.sha,
      GITHUB_PR_HEAD_USER: pullRequest.head.user.login,
      GITHUB_PR_TRIGGERED_SHA: commitToBuild,
      GITHUB_PR_LABELS: labels,
      GITHUB_PR_TRIGGER_USER: context.sender?.login ?? '',
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

    try {
      // 7.17 doesn't support build reuse, but all active branches going forward should be fine
      if (prConfig.kibana_build_reuse && targetBranch !== '7.17') {
        if (!prConfig.kibana_build_reuse_label || pullRequest.labels.some((l) => l.name === prConfig.kibana_build_reuse_label)) {
          const reusableJob = await this.getPossibleReusableBuildJob(prConfig, context);
          if (reusableJob) {
            buildParams['KIBANA_BUILD_ID'] = reusableJob.build.id;
            buildParams['KIBANA_REUSABLE_BUILD_BUILD_ID'] = reusableJob.build.id;
            buildParams['KIBANA_REUSABLE_BUILD_JOB_ID'] = reusableJob.id;
            buildParams['KIBANA_REUSABLE_BUILD_JOB_URL'] = reusableJob.web_url;
          }
        }
      }
    } catch (ex) {
      console.error('Error while checking for reusable build', ex.toString());
    }

    try {
      let triggerParams: BuildkiteTriggerBuildParams;

      if (prConfig.always_trigger_branch) {
        triggerParams = {
          branch: prConfig.always_trigger_branch,
          commit: 'HEAD',
          env: buildParams,
        };
      } else {
        triggerParams = {
          branch: `${pullRequest.head.repo.owner.login}:${pullRequest.head.ref}`,
          commit: commitToBuild,
          pull_request_base_branch: targetBranch,
          pull_request_id: pullRequest.number,
          pull_request_repository: pullRequest.head.repo.git_url, // TODO clone_url?
          env: buildParams,
        };
      }

      const status = await this.buildkite.triggerBuild(prConfig.pipeline_slug, triggerParams);

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

    try {
      if (context.type === PullRequestEventTriggerType.Create || context.type === PullRequestEventTriggerType.Update) {
        if (prConfig.skip_ci_on_only_changed?.length > 0 && pullRequest.changed_files < 1000) {
          const skipRegexes = prConfig.skip_ci_on_only_changed.map((regex) => new RegExp(regex, 'i'));
          const requiredRegexes = prConfig.always_require_ci_on_changed?.map((regex) => new RegExp(regex, 'i'));

          // Check only files that have changed since the last green build. If the changed files don't require CI, we can skip
          if (
            prConfig.enable_skippable_commits ||
            (prConfig.skippable_changes_beta_label && pullRequest.labels.some((l) => l.name === prConfig.skippable_changes_beta_label))
          ) {
            const commits = await this.getCommitsForBuildCompare(context, 0);
            const buildJobs = await this.buildkiteIngestData.getBuildsForCommits(commits, prConfig.kibana_build_reuse_pipeline_slugs);
            const lastGreenBuild = buildJobs.find((build) => build.state === 'passed');
            if (lastGreenBuild) {
              context.log(`Found a green build to compare against: ${lastGreenBuild.web_url}`);
            }

            // If there's no green build for this PR so far, we should check all files in the PR
            const commitForCompare = lastGreenBuild ? lastGreenBuild.commit : pullRequest.base.sha;
            context.log(`Checking against commit ${commitForCompare} to see if this build can be skipped...`);

            const resp = await this.github.repos.compareCommitsWithBasehead({
              owner: context.owner,
              repo: context.repo,
              basehead: `${commitForCompare}...${context.pullRequest.head.sha}`,
            });

            // The API only returns up to 300 files. To get the full list in this case, you have to ask github for the full diff in diff format.
            // This diff could be huge, so let's just assume that if there are over 300 files in the diff, it's pretty unlikely to be skippable.
            if (resp.data.files && resp.data.files.length < 300) {
              // If changes aren't skippable, go ahead and fall back to the old skippable check below
              if (this.areChangesSkippable(skipRegexes, requiredRegexes, resp.data.files)) {
                return true;
              }
            }
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
    } catch (ex: any) {
      console.error('Error checking for skippable changes', ex.toString());
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
          context: prConfig.commit_status_context || `buildkite/${prConfig.pipeline_slug}`,
        });
      }

      return;
    }

    const skippedForOldBranch = await this.maybeSkipForOldBranch(prConfig, context);
    if (skippedForOldBranch) {
      return;
    }

    if (
      prConfig.use_merge_commit &&
      prConfig.fail_on_not_mergable &&
      (!context.pullRequest.mergeable || !context.pullRequest.merge_commit_sha)
    ) {
      await this.notifyCommitNotMergeable(context);

      if (prConfig.set_commit_status) {
        await this.github.repos.createCommitStatus({
          owner: context.owner,
          repo: context.repo,
          sha: context.pullRequest.head.sha,
          state: 'error',
          description: 'Could not trigger build',
          context: prConfig.commit_status_context,
        });
      }
      return;
    }

    await this.triggerBuild(prConfig, context);
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

    if (prConfig.cancel_intermediate_builds) {
      try {
        await this.cancelIntermediateBuilds(prConfig, context, buildStatus);
      } catch (ex) {
        context.error('Error while trying to cancel intermediate builds');
        context.error(ex.toString());
      }
    }

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

  cancelIntermediateBuilds = async (prConfig: PrConfig, context: PullRequestEventContext, buildStatus: BuildkiteBuild) => {
    if (!prConfig.cancel_intermediate_builds_on_comment && context.type === PullRequestEventTriggerType.Comment) {
      return;
    }

    const branch = `${context.pullRequest.head.repo.owner.login}:${context.pullRequest.head.ref}`;
    const builds = await this.buildkite.getRunningBuilds(prConfig.pipeline_slug, branch);
    const buildsToCancel = builds.filter((build) => build.number < buildStatus.number);
    for (const build of buildsToCancel) {
      try {
        await this.buildkite.cancelBuild(prConfig.pipeline_slug, build.number);
      } catch (ex) {
        context.error(`Error while trying to cancel build #${build.number}`);
        context.error(ex.toString());
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

    if (prConfig.target_branch) {
      const targetBranches = Array.isArray(prConfig.target_branch) ? prConfig.target_branch : [prConfig.target_branch];

      if (!targetBranches.includes(context.pullRequest.base.ref)) {
        return false;
      }
    }

    if (prConfig.skip_target_branches?.length && prConfig.skip_target_branches.includes(context.pullRequest.base.ref)) {
      return false;
    }

    // If the skip-ci label is present, skip the trigger unless it came from a comment
    if (context.type !== PullRequestEventTriggerType.Comment && prConfig.skip_ci_labels.length && context.pullRequest.labels?.length) {
      const prLabels = context.pullRequest.labels.map((l) => l.name);

      for (const skipCiLabel of prConfig.skip_ci_labels) {
        if (prLabels.includes(skipCiLabel)) {
          context.log(`Skipping '${prConfig.pipeline_slug}' because skip label '${prConfig.skip_ci_label}' is present`);

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
