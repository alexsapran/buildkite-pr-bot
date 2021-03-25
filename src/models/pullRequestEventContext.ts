import { RestEndpointMethodTypes } from '@octokit/rest';
import { EventPayloads } from '@octokit/webhooks';
import { ParsedComment } from '../lib/parseComment';

import logger from '../lib/logger';

export enum PullRequestEventTriggerType {
  Create,
  Update,
  Comment,
  Label,
}
export class PullRequestEventContextData {
  type: PullRequestEventTriggerType;

  owner: string;
  repo: string;

  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'];

  comment?: EventPayloads.WebhookPayloadIssueCommentComment;
  parsedComment?: ParsedComment;
  label?: string;

  constructor(i: PullRequestEventContextData) {
    Object.assign(this, i);
  }
}

export default class PullRequestEventContext extends PullRequestEventContextData {
  constructor(i: PullRequestEventContextData) {
    super(i);
  }

  invokeLogger = (method: string, message: string, ...args: any[]) => {
    const data =
      process.env.NODE_ENV !== 'production'
        ? {}
        : ({
            owner: this.owner,
            repo: this.repo,
            prNumber: this.pullRequest.number,
          } as any);

    if (args && args.length) {
      data.extra = args;
    }

    logger[method](`[${this.owner}/${this.repo}#${this.pullRequest.number}] ${message}`, data);
  };

  log = (message: string, ...args: any[]) => {
    this.invokeLogger('info', message, ...args);
  };

  error = (message: string, ...args: any[]) => {
    this.invokeLogger('error', message, ...args);
  };
}
