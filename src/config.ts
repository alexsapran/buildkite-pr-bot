import { Octokit } from '@octokit/rest';
import { components } from '@octokit/openapi-types';
import { PrConfig } from './models/prConfig';
import getFileFromRepo from './lib/getFileFromRepo';

type GetRepoContentResponseDataFile = components['schemas']['content-file'];

const appConfig = require(process.env.APP_CONFIG || './defaultConfig.js');

export const getRepoConfig = (repoOwner: string, repoName: string, config = appConfig) => {
  let repoConfig = config.repos.find((repo) => repo.owner === repoOwner && repo.repo === repoName);

  if (!repoConfig) {
    repoConfig = {
      owner: repoOwner,
      repo: repoName,
    };
  }

  return repoConfig;
};

// TODO error scenarios etc
export default async function getConfigs(repoOwner: string, repoName: string, github: Octokit, config = appConfig) {
  const repoConfig = getRepoConfig(repoOwner, repoName, config);

  if (!repoConfig) {
    return null;
  }

  const json = await getFileFromRepo(
    github,
    repoConfig.configOwner || repoConfig.owner,
    repoConfig.configRepo || repoConfig.repo,
    repoConfig.configBranch || 'main',
    repoConfig.configPath || '.buildkite/pull-requests.json'
  );
  const parsed = JSON.parse(json);

  if (parsed?.jobs) {
    return parsed.jobs.map((job) => new PrConfig(job));
  }
}
