require('dotenv').config();

import { Octokit } from '@octokit/rest';
import { Webhooks } from '@octokit/webhooks';
import express from 'express';

import Buildkite from './buildkite';
import bootstrapSecrets from './bootstrapGcpSecrets';
import setupWebhooks from './setupWebhooks';
import PullRequests from './pullRequests';

import logger from './lib/logger';
import { BuildkiteIngestData } from './buildkiteIngestData';

(async () => {
  if (process.env.BOOTSTRAP_GCP_SECRETS) {
    await bootstrapSecrets();
  }

  const github = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const webhooks = new Webhooks({
    secret: process.env.WEBHOOK_SECRET,
  });

  const buildkite = new Buildkite();

  const buildkiteIngestData = new BuildkiteIngestData();

  if (process.env.DRY_RUN) {
    buildkite.triggerBuild = ((slug, options) => console.log(slug, options)) as typeof buildkite.triggerBuild;
    github.repos.createCommitStatus = ((options) => console.log(options)) as typeof github.repos.createCommitStatus;
  }

  const app = express();
  app.use(webhooks.middleware);
  app.get('/live', (req, res) => {
    res.send('i am alive');
  });

  app.listen(process.env.PORT || 3000, () => logger.info('Server started on port 3000'));

  await setupWebhooks(github, new PullRequests(github, buildkite, buildkiteIngestData), webhooks);

  logger.info('App started');
})();
