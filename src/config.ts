import { Octokit } from '@octokit/rest';
import { components } from '@octokit/openapi-types';
import { PrConfig } from './models/prConfig';
import getFileFromRepo from './lib/getFileFromRepo';

type GetRepoContentResponseDataFile = components['schemas']['content-file'];

const appConfig = require(process.env.APP_CONFIG || './defaultConfig.js');

export const getRepoConfig = (repoOwner: string, repoName: string, config = appConfig) => {
  let repoConfig = config.repos.find((repo) => repo.owner === repoOwner && repo.repo === repoName);

  if (!repoConfig) {
    if (repoOwner !== 'elastic') {
      return null;
    }

    repoConfig = {
      owner: repoOwner,
      repo: repoName,
      isDefault: true,
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

  let json = '';
  try {
    json = await getFileFromRepo(
      github,
      repoConfig.configOwner || repoConfig.owner,
      repoConfig.configRepo || repoConfig.repo,
      repoConfig.configBranch || 'main',
      repoConfig.configPath || '.buildkite/pull-requests.json'
    );
  } catch (ex) {
    if (repoConfig.isDefault) {
      json = await getFileFromRepo(
        github,
        repoConfig.configOwner || repoConfig.owner,
        repoConfig.configRepo || repoConfig.repo,
        repoConfig.configBranch || 'master',
        repoConfig.configPath || '.buildkite/pull-requests.json'
      );
    } else {
      throw ex;
    }
  }
  const parsed = JSON.parse(json);

  if (parsed?.jobs) {
    return parsed.jobs.map((job) => new PrConfig(job));
  }
}
