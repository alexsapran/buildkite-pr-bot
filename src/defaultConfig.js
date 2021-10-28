module.exports = {
  repos: [
    {
      owner: 'elastic',
      repo: 'kibana',

      configBranch: 'main',
      configPath: '.buildkite/pull_requests.json',
    },
    {
      owner: 'brianseeders',
      repo: 'kibana',

      configOwner: 'brianseeders',
      configRepo: 'kibana',
      configBranch: 'buildkite-pr-bot',
    },
    {
      owner: 'elastic',
      repo: 'kibana-github-actions',
      configBranch: 'main',
      configPath: '.buildkite/pull-requests.json',
    },
  ],
};
