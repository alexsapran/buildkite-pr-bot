module.exports = {
  repos: [
    {
      owner: 'elastic',
      repo: 'kibana',

      configBranch: 'buildkite-pr-bot',
      // configPath: '',
    },
    {
      owner: 'brianseeders',
      repo: 'kibana',

      configOwner: 'brianseeders',
      configRepo: 'kibana',
      configBranch: 'buildkite-pr-bot',
      // configPath: '',
    },
    {
      owner: 'elastic',
      repo: 'kibana-github-actions',
      configBranch: 'main',
      configPath: '.buildkite/pull-requests.json',
    },
  ],
};
