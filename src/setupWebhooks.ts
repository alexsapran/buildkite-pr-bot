import { Octokit } from '@octokit/rest';
import { Webhooks, EventPayloads } from '@octokit/webhooks';
import PullRequestEventContext, { PullRequestEventTriggerType } from './models/pullRequestEventContext';
import PullRequests from './pullRequests';
import { getRepoConfig } from './config';

import logger from './lib/logger';

const configCheck = (eventRepo: EventPayloads.PayloadRepository) => {
  if (!getRepoConfig(eventRepo.owner.login, eventRepo.name)) {
    logger.info(`Ignoring pull request event for unknown repo ${eventRepo.owner.login}/${eventRepo.name}`);
    return false;
  }

  return true;
};

export default async (github: Octokit, pullRequests: PullRequests, webhooks: Webhooks) => {
  webhooks.on('issue_comment.created', async ({ payload }) => {
    const issue = payload.issue as EventPayloads.WebhookPayloadIssuesIssue;
    const { repository } = payload;

    if (!issue.pull_request) {
      return;
    }

    if (!configCheck(repository)) {
      return;
    }

    const resp = await github.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.issue.number,
    });

    const context = new PullRequestEventContext({
      type: PullRequestEventTriggerType.Comment,
      pullRequest: resp.data,
      owner: repository.owner.login,
      repo: repository.name,
      comment: payload.comment,
    });

    await pullRequests.handleContext(context);
  });

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  webhooks.on(['pull_request.opened', 'pull_request.synchronize'], async ({ payload, name }) => {
    const { repository, pull_request } = payload;

    if (!configCheck(repository)) {
      return;
    }

    if (payload.action === 'opened') {
      const key = `${repository.owner.login}/${repository.name}/${pull_request.number}`;
      logger.info(`New PR ${key} - waiting 10 seconds for labels to settle`);
      await sleep(process.env.DRY_RUN ? 1 : 10000);
    }

    const resp = await github.pulls.get({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number,
    });

    const pullRequestFromApi = resp.data;

    const context = new PullRequestEventContext({
      type: payload.action === 'opened' ? PullRequestEventTriggerType.Create : PullRequestEventTriggerType.Update,
      pullRequest: pullRequestFromApi,
      owner: repository.owner.login,
      repo: repository.name,
    });

    await pullRequests.handleContext(context);
  });

  if (process.env.DRY_RUN) {
    await webhooks.receive(require('./test-payloads/pr-opened')());
    // await webhooks.receive(require('./test-payloads/pr-synchronize')());
    // await webhooks.receive(require('./test-payloads/trigger-comment')());
    // await webhooks.receive(require('./test-payloads/trigger-comment')());
  }
};
