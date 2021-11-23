import { setImmediate } from 'timers';

import { Octokit } from '@octokit/rest';
import { Webhooks } from '@octokit/webhooks';

import setupWebhooks from './setupWebhooks';

import PullRequests from './pullRequests';
import PullRequestEventContext, { PullRequestEventTriggerType } from './models/pullRequestEventContext';

import payloadTriggerComment from './test-payloads/trigger-comment';
import payloadPrOpened from './test-payloads/pr-opened';
import payloadPrSync from './test-payloads/pr-synchronize';

let githubMock: Octokit;
let webhooks: Webhooks;
let pullRequestsMock: jest.Mocked<PullRequests>;

jest.useFakeTimers();

function mockOctokit(octokitMock: any): Octokit {
  return octokitMock as Octokit;
}

// https://github.com/facebook/jest/issues/10602#issuecomment-791182939
const autoAdvanceTimers = <Result>(callback: () => Promise<Result>) => async () => {
  const promise = callback();
  let resolved = false;
  promise.then(() => {
    resolved = true;
  });
  while (!resolved) {
    await new Promise(setImmediate);
    if (jest.getTimerCount() === 0) {
      break;
    }
    jest.advanceTimersToNextTimer();
  }
  return await promise;
};

describe('setupWebhooks', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  const doSetup = async (githubMockArg: Octokit = null, webhook = null) => {
    githubMock =
      githubMockArg ||
      mockOctokit({
        pulls: {
          get: jest.fn().mockResolvedValueOnce({
            data: { state: 'open', number: 1, head: { sha: webhook?.payload?.pull_request?.head?.sha ?? 'sha' } },
          }),
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
      const payload = payloadTriggerComment();
      await doSetup(null, payload);
      await webhooks.receive(payload);

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
      const prComment = payloadTriggerComment();
      prComment.payload.repository.name = 'invalid-repo';
      await doSetup(null, prComment);
      await webhooks.receive(prComment);

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('pull_request.opened', () => {
    const runTimers = jest.fn((ms = 9000) => {
      jest.advanceTimersByTime(ms);
      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(0);
      jest.runAllTimers();
    });

    it('should trigger PR handler for a configured repo and wait 10 seconds for labels to settle', async () => {
      const payload = payloadPrOpened();
      await doSetup(null, payload);

      webhooks.onAny(runTimers);

      await webhooks.receive(payload);

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
      const prOpened = payloadPrOpened();
      await doSetup(null, prOpened);
      webhooks.onAny(runTimers);
      prOpened.payload.repository.name = 'invalid-repo';
      await webhooks.receive(prOpened);

      expect(runTimers).toHaveBeenCalled();
      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('pull_request.synchronize', () => {
    it('should trigger PR handler for a configured repo', async () => {
      const payload = payloadPrSync();
      await doSetup(null, payload);

      await webhooks.receive(payload);

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);

      const context = pullRequestsMock.handleContext.mock.calls[0][0] as PullRequestEventContext;

      expect(context.type).toBe(PullRequestEventTriggerType.Update);
      expect(context.owner).toBe('elastic');
      expect(context.repo).toBe('kibana');
      expect(context.pullRequest.number).toBe(1);
      expect(context.comment).toBeFalsy();
      expect(context.label).toBeFalsy();
    });

    it(
      'should pull the PR from the API twice if the shas do not match',
      autoAdvanceTimers(async () => {
        const payload = payloadPrSync();
        await doSetup(
          mockOctokit({
            pulls: {
              get: jest.fn().mockResolvedValue({
                data: { state: 'open', number: 1, head: { sha: payload.payload.pull_request.head.sha } },
              }),
            },
          }),
          payload
        );

        payload.payload.pull_request.head.sha = 'invalid-sha';
        await webhooks.receive(payload);

        expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
        expect(githubMock.pulls.get).toHaveBeenCalledTimes(2);

        const context = pullRequestsMock.handleContext.mock.calls[0][0] as PullRequestEventContext;

        expect(context.type).toBe(PullRequestEventTriggerType.Update);
        expect(context.owner).toBe('elastic');
        expect(context.repo).toBe('kibana');
        expect(context.pullRequest.number).toBe(1);
        expect(context.comment).toBeFalsy();
        expect(context.label).toBeFalsy();
      })
    );

    it('should trigger PR handler for a non-configured repo', async () => {
      const prUpdated = payloadPrSync();
      await doSetup(null, prUpdated);
      prUpdated.payload.repository.name = 'invalid-repo';
      await webhooks.receive(prUpdated);

      expect(pullRequestsMock.handleContext).toHaveBeenCalledTimes(1);
    });
  });
});
