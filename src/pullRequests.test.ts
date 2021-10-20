import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { EventPayloads } from '@octokit/webhooks';
import PullRequests from './pullRequests';
import { ParsedComment } from './lib/parseComment';
import Buildkite from './buildkite';
import { PrConfig } from './models/prConfig';
import PullRequestEventContext, { PullRequestEventContextData, PullRequestEventTriggerType } from './models/pullRequestEventContext';
import getConfigs from './config';

const BuildkiteMock = Buildkite as jest.Mocked<typeof Buildkite>;
const OctokitMock = Octokit as jest.Mocked<typeof Octokit>;

jest.mock('./config');

const getConfigsMock = getConfigs as jest.MockedFunction<typeof getConfigs>;

const createMocks = () => {
  return {
    PR: {
      state: 'open',
      number: 12345,
      user: {
        login: 'user',
      },
      base: {
        ref: 'TARGET_BRANCH',
        sha: 'TARGET_SHA',
        repo: {
          name: 'TARGET_REPO',
          owner: {
            login: 'TARGET_OWNER',
          },
        },
      },
      head: {
        ref: 'PR_BRANCH',
        sha: 'PR_SHA',
        repo: {
          owner: {
            login: 'PR_OWNER',
          },
          name: 'PR_REPO',
        },
      },
      labels: [
        {
          name: 'label_1',
        },
        {
          name: 'label_2',
        },
      ],
    } as RestEndpointMethodTypes['pulls']['get']['response']['data'],
    PR_CONFIG: new PrConfig({
      pipelineSlug: 'pipeline-slug',
      repoOwner: 'repo-owner',
      repoName: 'repo',
    } as PrConfig),
  };
};

describe('pullRequests', () => {
  let mocks = createMocks();
  let buildkiteMock = new BuildkiteMock();
  let githubMock = new OctokitMock();

  beforeEach(() => {
    mocks = createMocks();
    buildkiteMock = new BuildkiteMock();
    githubMock = new OctokitMock();

    jest.clearAllMocks();
  });

  describe('triggerBuild', () => {
    it('should trigger a build for an updated PR', async () => {
      const contextMock = new PullRequestEventContext({
        owner: 'owner',
        repo: 'repo',
        pullRequest: mocks.PR,
        type: PullRequestEventTriggerType.Update,
      });

      const pr = new PullRequests(githubMock, buildkiteMock);
      buildkiteMock.triggerBuild = jest.fn(async () => ({
        id: 'build-id',
        number: 123,
        url: 'http://localhost:1234/url',
        web_url: 'http://localhost:1234/web_url',
        state: 'queued',
        message: 'Message',
        commit: '123456789',
      }));

      await pr.triggerBuild(mocks.PR_CONFIG, contextMock);

      expect((buildkiteMock.triggerBuild as jest.Mock).mock.calls[0][0]).toBe(mocks.PR_CONFIG.pipelineSlug);
      expect((buildkiteMock.triggerBuild as jest.Mock).mock.calls[0][1]).toMatchInlineSnapshot(`
        Object {
          "branch": "PR_OWNER:PR_BRANCH",
          "commit": "PR_SHA",
          "env": Object {
            "GITHUB_PR_BASE_OWNER": "TARGET_OWNER",
            "GITHUB_PR_BASE_REPO": "TARGET_REPO",
            "GITHUB_PR_BRANCH": "PR_BRANCH",
            "GITHUB_PR_LABELS": "label_1,label_2",
            "GITHUB_PR_NUMBER": "12345",
            "GITHUB_PR_OWNER": "PR_OWNER",
            "GITHUB_PR_REPO": "PR_REPO",
            "GITHUB_PR_TARGET_BRANCH": "TARGET_BRANCH",
            "GITHUB_PR_TRIGGERED_SHA": "PR_SHA",
          },
          "pull_request_base_branch": "TARGET_BRANCH",
          "pull_request_id": 12345,
          "pull_request_repository": undefined,
        }
      `);
    });

    it('should trigger a build for a comment and send along the extra arguments', async () => {
      const comment = {
        comment: 'buildkite deploy Thing to Place',
        match: 'buildkite deploy Thing to Place',
        groups: {
          product: 'thing',
          location: 'place',
        },
      } as ParsedComment;

      const contextMock = new PullRequestEventContext({
        owner: 'owner',
        repo: 'repo',
        pullRequest: mocks.PR,
        type: PullRequestEventTriggerType.Comment,
        comment: {
          body: comment.comment,
        } as EventPayloads.WebhookPayloadIssueCommentComment,
        parsedComment: comment,
      });

      const pr = new PullRequests(githubMock, buildkiteMock);
      buildkiteMock.triggerBuild = jest.fn(async () => ({
        id: 'build-id',
        number: 123,
        url: 'http://localhost:1234/url',
        web_url: 'http://localhost:1234/web_url',
        state: 'queued',
        message: 'Message',
        commit: '123456789',
      }));
      await pr.triggerBuild(mocks.PR_CONFIG, contextMock);

      expect((buildkiteMock.triggerBuild as jest.Mock).mock.calls[0][0]).toBe(mocks.PR_CONFIG.pipelineSlug);
      expect((buildkiteMock.triggerBuild as jest.Mock).mock.calls[0][1]).toMatchInlineSnapshot(`
        Object {
          "branch": "PR_OWNER:PR_BRANCH",
          "commit": "PR_SHA",
          "env": Object {
            "GITHUB_PR_BASE_OWNER": "TARGET_OWNER",
            "GITHUB_PR_BASE_REPO": "TARGET_REPO",
            "GITHUB_PR_BRANCH": "PR_BRANCH",
            "GITHUB_PR_COMMENT_VAR_LOCATION": "place",
            "GITHUB_PR_COMMENT_VAR_PRODUCT": "thing",
            "GITHUB_PR_LABELS": "label_1,label_2",
            "GITHUB_PR_NUMBER": "12345",
            "GITHUB_PR_OWNER": "PR_OWNER",
            "GITHUB_PR_REPO": "PR_REPO",
            "GITHUB_PR_TARGET_BRANCH": "TARGET_BRANCH",
            "GITHUB_PR_TRIGGERED_SHA": "PR_SHA",
            "GITHUB_PR_TRIGGER_COMMENT": "buildkite deploy Thing to Place",
          },
          "pull_request_base_branch": "TARGET_BRANCH",
          "pull_request_id": 12345,
          "pull_request_repository": undefined,
        }
      `);
    });

    it('should set commit status', async () => {
      mocks.PR_CONFIG.set_commit_status = true;
      mocks.PR_CONFIG.commit_status_context = 'commit-status-context';

      const contextMock = new PullRequestEventContext({
        owner: 'owner',
        repo: 'repo',
        pullRequest: mocks.PR,
        type: PullRequestEventTriggerType.Update,
      });

      const pr = new PullRequests(githubMock, buildkiteMock);
      buildkiteMock.triggerBuild = jest.fn(async () => ({
        id: 'build-id',
        number: 123,
        url: 'http://localhost:1234/url',
        web_url: 'http://localhost:1234/web_url',
        state: 'queued',
        message: 'Message',
        commit: '123456789',
      }));

      githubMock.repos.createCommitStatus = (jest.fn(() => {
        return {
          status: 204,
        };
      }) as any) as jest.MockedFunction<typeof githubMock.repos.createCommitStatus>;

      await pr.triggerBuild(mocks.PR_CONFIG, contextMock);

      const mockCallArgs = (githubMock.repos.createCommitStatus as jest.MockedFunction<typeof githubMock.repos.createCommitStatus>).mock
        .calls[0][0];
      expect(mockCallArgs).toMatchInlineSnapshot(`
        Object {
          "context": "commit-status-context",
          "description": "Job queued",
          "owner": "owner",
          "repo": "repo",
          "sha": "PR_SHA",
          "state": "pending",
          "target_url": "http://localhost:1234/web_url",
        }
      `);
    });
  });

  const createPrConfig = (props: Partial<PrConfig> = {}): PrConfig => {
    return new PrConfig({
      enabled: true,
      target_branch: mocks.PR.base.ref,
      allowed_list: [mocks.PR.user.login],
      ...props,
    } as PrConfig);
  };

  describe('handleContext', () => {
    const doContextTest = async (contextProps: Partial<PullRequestEventContextData> = {}, prConfigs = [createPrConfig()]) => {
      const context = new PullRequestEventContext({
        owner: 'owner',
        repo: 'repo',
        pullRequest: mocks.PR,
        type: PullRequestEventTriggerType.Create,
        ...contextProps,
      });

      getConfigsMock.mockResolvedValueOnce(prConfigs);

      const pr = new PullRequests(githubMock, buildkiteMock);
      pr.triggerBuild = jest.fn();

      await pr.handleContext(context);

      return {
        context,
        pr,
      };
    };

    it('should trigger a build with a simple PR creation event', async () => {
      const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create });
      expect(pr.triggerBuild).toHaveBeenCalled();
    });

    it('should trigger multiple builds for a simple PR creation event', async () => {
      const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [
        createPrConfig(),
        createPrConfig(),
        createPrConfig(),
      ]);
      expect(pr.triggerBuild).toHaveBeenCalledTimes(3);
    });

    it('should not trigger a build if the build is disabled', async () => {
      const prConfig = createPrConfig({
        enabled: false,
      });

      const { pr } = await doContextTest({}, [prConfig]);
      expect(pr.triggerBuild).not.toHaveBeenCalled();
    });

    it('should not trigger a build if the build is set to not build on commit', async () => {
      const prConfig = createPrConfig({
        build_on_commit: false,
      });

      const { pr } = await doContextTest({}, [prConfig]);
      expect(pr.triggerBuild).not.toHaveBeenCalled();
    });

    it('should not trigger a build if target branch does not match', async () => {
      const prConfig = createPrConfig({
        target_branch: 'invalid-target-branch',
      });

      const { pr } = await doContextTest({}, [prConfig]);
      expect(pr.triggerBuild).not.toHaveBeenCalled();
    });

    it('should trigger a build if no target branch is required', async () => {
      const prConfig = createPrConfig({
        target_branch: null,
      });

      const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create });
      expect(pr.triggerBuild).toHaveBeenCalled();
    });

    it('should not trigger a build if the skip-ci label is present', async () => {
      mocks.PR.labels = [
        {
          name: 'skip-me',
        },
      ] as RestEndpointMethodTypes['pulls']['get']['response']['data']['labels'];

      const prConfig = createPrConfig({
        skip_ci_label: 'skip-me',
      });

      const { pr } = await doContextTest({}, [prConfig]);
      expect(pr.triggerBuild).not.toHaveBeenCalled();
    });

    it('should not trigger a build if a skip-ci label is present', async () => {
      mocks.PR.labels = [
        {
          name: 'skip-me',
        },
      ] as RestEndpointMethodTypes['pulls']['get']['response']['data']['labels'];

      const prConfig = createPrConfig({
        skip_ci_labels: ['skip-this', 'skip-me'],
      });

      const { pr } = await doContextTest({}, [prConfig]);
      expect(pr.triggerBuild).not.toHaveBeenCalled();
    });

    describe('with a comment event', () => {
      it('should trigger and set the parsed comment if the comment is valid', async () => {
        const comment = {
          body: 'buildkite build this',
          user: { login: mocks.PR.user.login },
        } as EventPayloads.WebhookPayloadIssueCommentComment;

        const { pr, context } = await doContextTest(
          {
            type: PullRequestEventTriggerType.Comment,
            comment: comment,
          },
          [createPrConfig()]
        );

        expect(pr.triggerBuild).toHaveBeenCalled();
        expect(context.parsedComment.comment).toBe('buildkite build this');
      });

      it('should trigger even if the skip-ci label is present', async () => {
        const comment = {
          body: 'buildkite build this',
          user: { login: mocks.PR.user.login },
        } as EventPayloads.WebhookPayloadIssueCommentComment;

        mocks.PR.labels = [
          {
            name: 'skip-me',
          },
        ] as RestEndpointMethodTypes['pulls']['get']['response']['data']['labels'];

        const { pr, context } = await doContextTest(
          {
            type: PullRequestEventTriggerType.Comment,
            comment: comment,
          },
          [createPrConfig({ skip_ci_label: 'skip-me' })]
        );

        expect(pr.triggerBuild).toHaveBeenCalled();
        expect(context.parsedComment.comment).toBe('buildkite build this');
      });

      it('should not trigger for a valid comment if build on comment is disabled', async () => {
        const comment = {
          body: 'buildkite build this',
          user: { login: mocks.PR.user.login },
        } as EventPayloads.WebhookPayloadIssueCommentComment;

        const { pr } = await doContextTest(
          {
            type: PullRequestEventTriggerType.Comment,
            comment: comment,
          },
          [createPrConfig({ build_on_comment: false })]
        );

        expect(pr.triggerBuild).not.toHaveBeenCalled();
      });

      it('should not trigger for an invalid comment', async () => {
        const comment = {
          body: 'buildkite how are you?',
          user: { login: mocks.PR.user.login },
        } as EventPayloads.WebhookPayloadIssueCommentComment;

        const { pr } = await doContextTest(
          {
            type: PullRequestEventTriggerType.Comment,
            comment: comment,
          },
          [createPrConfig()]
        );

        expect(pr.triggerBuild).not.toHaveBeenCalled();
      });

      it('should not trigger for an invalid user', async () => {
        const comment = {
          body: 'buildkite build this',
          user: { login: 'definitely-not-a-hacker' },
        } as EventPayloads.WebhookPayloadIssueCommentComment;

        const { pr } = await doContextTest(
          {
            type: PullRequestEventTriggerType.Comment,
            comment: comment,
          },
          [createPrConfig()]
        );

        expect(pr.triggerBuild).not.toHaveBeenCalled();
      });

      it('should trigger if the always trigger comment matches, even if other general requirements are invalid', async () => {
        const comment = {
          body: 'build this or else',
          user: { login: mocks.PR.user.login },
        } as EventPayloads.WebhookPayloadIssueCommentComment;

        const { pr } = await doContextTest(
          {
            type: PullRequestEventTriggerType.Comment,
            comment: comment,
          },
          [createPrConfig({ labels: ['invalid-label'], always_trigger_comment_regex: 'build this or else' })]
        );

        expect(pr.triggerBuild).toHaveBeenCalled();
      });
    });

    describe('with a job configured with labels', () => {
      it('should trigger a build if PR is has the correct label', async () => {
        const prConfig = createPrConfig({
          labels: ['label_2'],
        });

        const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [prConfig]);
        expect(pr.triggerBuild).toHaveBeenCalled();
      });

      it('should not trigger a build if PR is missing the correct labels', async () => {
        const prConfig = createPrConfig({
          labels: ['invalid-label'],
        });

        const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [prConfig]);
        expect(pr.triggerBuild).not.toHaveBeenCalled();
      });
    });

    describe('with user privilege settings', () => {
      it('should trigger a build if user part of specified org', async () => {
        mocks.PR.user.login = 'some-other-user';

        const prConfig = createPrConfig({
          allow_org_users: true,
          allowed_list: null,
        });

        githubMock.orgs.checkMembershipForUser = (jest.fn(() => {
          return {
            status: 204,
          };
        }) as any) as jest.MockedFunction<typeof githubMock.orgs.checkMembershipForUser>;

        const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [prConfig]);
        expect(pr.triggerBuild).toHaveBeenCalled();
      });

      it('should not trigger a build if user not part of specified org', async () => {
        const prConfig = createPrConfig({
          allow_org_users: true,
          allowed_list: null,
        });

        githubMock.orgs.checkMembershipForUser = (jest.fn(() => {
          return {
            status: 304,
          };
        }) as any) as jest.MockedFunction<typeof githubMock.orgs.checkMembershipForUser>;

        const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [prConfig]);
        expect(pr.triggerBuild).not.toHaveBeenCalled();
      });

      it('should trigger a build if user has appropriate repo permissions', async () => {
        const prConfig = createPrConfig({
          allowed_repo_permissions: ['admin', 'write'],
          allowed_list: null,
        });

        githubMock.repos.getCollaboratorPermissionLevel = (jest.fn(() => {
          return {
            data: {
              permission: 'write',
            },
          };
        }) as any) as jest.MockedFunction<typeof githubMock.repos.getCollaboratorPermissionLevel>;

        const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [prConfig]);
        expect(pr.triggerBuild).toHaveBeenCalled();
      });

      it('should not trigger a build if user does not have appropriate repo permissions', async () => {
        const prConfig = createPrConfig({
          allowed_repo_permissions: ['admin'],
          allowed_list: null,
        });

        githubMock.repos.getCollaboratorPermissionLevel = (jest.fn(() => {
          return {
            data: {
              permission: 'write',
            },
          };
        }) as any) as jest.MockedFunction<typeof githubMock.repos.getCollaboratorPermissionLevel>;

        const { pr } = await doContextTest({ type: PullRequestEventTriggerType.Create }, [prConfig]);
        expect(pr.triggerBuild).not.toHaveBeenCalled();
      });
    });
  });
});
