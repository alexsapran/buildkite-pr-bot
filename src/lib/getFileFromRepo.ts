import { Octokit } from '@octokit/rest';
import { components } from '@octokit/openapi-types';

type GetRepoContentResponseDataFile = components['schemas']['content-file'];

export default async function getFileFromRepo(
  github: Octokit,
  repoOwner: string,
  repoName: string,
  ref: string,
  filePath: string
): Promise<string> {
  const request = {
    owner: repoOwner,
    repo: repoName,
    ref: ref,
    path: filePath,
  };

  const response = await github.repos.getContent(request);

  const { data } = response;

  if (Array.isArray(data)) {
    throw new Error(`Expected ${request.owner}/${request.repo}/${request.ref}/${request.path} to be a file, got a directory instead.`);
  }

  // https://github.com/octokit/rest.js/issues/32#issuecomment-747129857
  const dataFile = data as GetRepoContentResponseDataFile;

  return Buffer.from(dataFile.content, 'base64').toString();
}
