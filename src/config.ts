import { Octokit } from '@octokit/rest';
import { OrgWidePrConfig, PrConfig } from './models/prConfig';
import getFileFromRepo from './lib/getFileFromRepo';

import Cache from './cache';

const orgWideConfigCache = new Cache();

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

export const _getOrgWideConfig = async (
  github: Octokit,
  repoOwner: string,
  repoName: string,
  branch: string = 'main',
  path: string = '.buildkite/pull-requests.org-wide.json'
) => {
  const json = await getFileFromRepo(github, repoOwner, repoName, branch, path);

  const config = JSON.parse(json);
  if (config?.jobs) {
    return config.jobs.map((job) => new PrConfig(job));
  }

  return [];
};

export const getOrgWideConfig = async (
  github: Octokit,
  repoOwner: string,
  repoName: string,
  branch: string = 'main',
  path: string = '.buildkite/pull-requests.org-wide.json'
) => {
  const key = `${repoOwner}/${repoName}:${branch}:${path}`;

  if (!orgWideConfigCache.get(key)) {
    try {
      const config = await _getOrgWideConfig(github, repoOwner, repoName, branch, path);
      orgWideConfigCache.set(key, config, 60 * 5);
    } catch (ex) {
      console.error(`Failed to load org-wide config for ${key}: ${ex.message}`);
      console.error(ex);
    }
  }

  return orgWideConfigCache.get(key) || [];
};

export const getOrgWideConfigs = async (github: Octokit): Promise<OrgWidePrConfig[]> => {
  if (!process.env.ORG_WIDE_CONFIGS) {
    return [];
  }

  const orgWideConfigLocations = process.env.ORG_WIDE_CONFIGS.split(',')
    .map((c) => c.trim())
    .filter((c) => c);

  const promises = orgWideConfigLocations.map((configLocation) => {
    const parts = configLocation.split(':');
    const [repoOwner, repoName] = parts[0].split('/');

    return getOrgWideConfig(github, repoOwner, repoName, parts[1] || undefined, parts[2] || undefined);
  });

  const responses = await Promise.all(promises);
  return responses.flat();
};

// TODO error scenarios etc
export default async function getConfigs(repoOwner: string, repoName: string, github: Octokit, config = appConfig) {
  const repoConfig = getRepoConfig(repoOwner, repoName, config);

  if (!repoConfig) {
    return null;
  }

  const orgWideConfigs = await getOrgWideConfigs(github);

  const owner = repoConfig.configOwner || repoConfig.owner;
  const name = repoConfig.configRepo || repoConfig.repo;
  const branch = repoConfig.configBranch || 'main';
  const path = repoConfig.configPath || '.buildkite/pull-requests.json';

  let json = '';
  try {
    json = await getFileFromRepo(github, owner, name, branch, path);
  } catch (ex) {
    if (repoConfig.isDefault) {
      json = await getFileFromRepo(github, owner, name, 'master', path);
    } else {
      throw ex;
    }
  }
  const parsed = JSON.parse(json);

  let prConfigs: PrConfig[] = [...orgWideConfigs.filter((c) => c.repositories?.includes(`${repoOwner}/${repoName}`))];

  if (parsed?.jobs) {
    prConfigs = [...prConfigs, ...parsed.jobs.map((job) => new PrConfig(job))];
  }

  return prConfigs;
}
