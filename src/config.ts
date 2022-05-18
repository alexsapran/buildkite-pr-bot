import { Octokit } from '@octokit/rest';
import { components } from '@octokit/openapi-types';
import { PrConfig } from './models/prConfig';

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

  const request = {
    owner: repoConfig.configOwner || repoConfig.owner,
    repo: repoConfig.configRepo || repoConfig.repo,
    ref: repoConfig.configBranch || 'main',
    path: repoConfig.configPath || '.buildkite/pull-requests.json',
  };

  const response = await github.repos.getContent(request);

  const { data } = response;

  if (Array.isArray(data)) {
    throw new Error(`Expected ${request.owner}/${request.repo}/${request.ref}/${request.path} to be a file, got a directory instead.`);
  }

  // https://github.com/octokit/rest.js/issues/32#issuecomment-747129857
  const dataFile = data as GetRepoContentResponseDataFile;

  const json = Buffer.from(dataFile.content, 'base64').toString();
  const parsed = JSON.parse(json);

  if (parsed?.jobs) {
    return parsed.jobs.map((job) => new PrConfig(job));
  }
}
