import { Octokit } from '@octokit/rest';
import getConfigs, { getRepoConfig } from './config';

const config = {
  repos: [
    {
      owner: 'test-owner',
      repo: 'test-repo',
    },
  ],
};

describe('config', () => {
  describe('getRepoConfig', () => {
    it('should return a valid config', async () => {
      const repoConfig = getRepoConfig('test-owner', 'test-repo', config);
      expect(repoConfig).not.toBeUndefined();
      expect(repoConfig.repo).toBe('test-repo');
    });

    it('should return undefined', async () => {
      const repoConfig = getRepoConfig('dne', 'test-repo', config);
      expect(repoConfig).toBeUndefined();
    });
  });

  describe('getConfigs', () => {
    let mockGithub: Octokit;

    beforeEach(() => {
      mockGithub = ({
        repos: {
          getContent: async (options) => {
            return {
              data: {
                content: Buffer.from(
                  JSON.stringify({
                    jobs: [
                      {
                        repoName: 'test-repo',
                      },
                    ],
                  })
                ).toString('base64'),
              },
            };
          },
        },
      } as any) as Octokit;
    });

    it('should return a valid config', async () => {
      const configs = await getConfigs('test-owner', 'test-repo', mockGithub, config);
      expect(configs).not.toBeNull();
      expect(configs[0].repoName).toBe('test-repo');
    });
  });
});
