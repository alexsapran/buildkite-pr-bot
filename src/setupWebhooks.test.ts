import { Octokit } from '@octokit/rest';
import { Webhooks } from '@octokit/webhooks';

import setupWebhooks from './setupWebhooks';

import PullRequests from './pullRequests';
import PullRequestEventContext, { PullRequestEventTriggerType } from './models/pullRequestEventContext';

let webhooks: Webhooks;
let pullRequestsMock: jest.Mocked<PullRequests>;

jest.useFakeTimers();

function mockOctokit(octokitMock: any): Octokit {
  return octokitMock as Octokit;
}

describe('setupWebhooks', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  const doSetup = async (githubMock: Octokit = null) => {
    githubMock =
      githubMock ||
      mockOctokit({
        pulls: {
          get: jest.fn().mockResolvedValueOnce({ data: { state: 'open', number: 1 } }),
        },
      });

    pullRequestsMock = {
      handleContext: jest.fn(),
    } as any;

    webhooks = new Webhooks({
      secret: 'secret',
    });

    await setupWebhooks(githubMock, pullRequestsMock, webhooks);
  };

  describe('issue_comment.created', () => {
    it('should trigger PR handler for a configured repo', async () => {
      await doSetup();
      await webhooks.receive(require('./test-payloads/trigger-comment')());

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);

      const context = pullRequestsMock.handleContext.mock.calls[0][0] as PullRequestEventContext;

      expect(context.type).toBe(PullRequestEventTriggerType.Comment);
      expect(context.owner).toBe('elastic');
      expect(context.repo).toBe('kibana');
      expect(context.pullRequest.number).toBe(1);
      expect(context.label).toBeFalsy();
      expect(context.comment.body).toBe('buildkite build this');
    });

    it('should trigger PR handler for a non-configured repo', async () => {
      await doSetup();
      const prComment = require('./test-payloads/trigger-comment')();
      prComment.payload.repository.name = 'invalid-repo';
      await webhooks.receive(prComment);

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('pull_request.opened', () => {
    const runTimers = jest.fn(() => {
      jest.advanceTimersByTime(9000);
      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(0);
      jest.runAllTimers();
    });

    it('should trigger PR handler for a configured repo and wait 10 seconds for labels to settle', async () => {
      await doSetup();

      webhooks.onAny(runTimers);

      await webhooks.receive(require('./test-payloads/pr-opened')());

      expect(runTimers).toHaveBeenCalled();
      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);

      const context = pullRequestsMock.handleContext.mock.calls[0][0] as PullRequestEventContext;

      expect(context.type).toBe(PullRequestEventTriggerType.Create);
      expect(context.owner).toBe('elastic');
      expect(context.repo).toBe('kibana');
      expect(context.pullRequest.number).toBe(1);
      expect(context.comment).toBeFalsy();
      expect(context.label).toBeFalsy();
    });

    it('should trigger PR handler for a non-configured repo', async () => {
      await doSetup();
      webhooks.onAny(runTimers);
      const prOpened = require('./test-payloads/pr-opened')();
      prOpened.payload.repository.name = 'invalid-repo';
      await webhooks.receive(prOpened);

      expect(runTimers).toHaveBeenCalled();
      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('pull_request.synchronize', () => {
    it('should trigger PR handler for a configured repo', async () => {
      await doSetup();
      await webhooks.receive(require('./test-payloads/pr-synchronize')());

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);

      const context = pullRequestsMock.handleContext.mock.calls[0][0] as PullRequestEventContext;

      expect(context.type).toBe(PullRequestEventTriggerType.Update);
      expect(context.owner).toBe('elastic');
      expect(context.repo).toBe('kibana');
      expect(context.pullRequest.number).toBe(1);
      expect(context.comment).toBeFalsy();
      expect(context.label).toBeFalsy();
    });

    it('should trigger PR handler for a non-configured repo', async () => {
      await doSetup();
      const prUpdated = require('./test-payloads/pr-synchronize')();
      prUpdated.payload.repository.name = 'invalid-repo';
      await webhooks.receive(prUpdated);

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
    });
  });
});
