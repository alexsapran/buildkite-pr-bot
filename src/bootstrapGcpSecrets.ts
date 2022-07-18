const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const GCP_SECRET_MAPPING = {
  GITHUB_TOKEN: 'kibana-buildkite-pr-bot-github-token',
  WEBHOOK_SECRET: 'kibana-buildkite-pr-bot-webhook-secret',
  BUILDKITE_TOKEN: 'kibana-buildkite-pr-bot-buildkite-token',
  ES_CLOUD_ID: 'kibana-buildkite-build-bot-es-cloud-id',
  ES_CLOUD_USERNAME: 'kibana-buildkite-build-bot-es-cloud-username',
  ES_CLOUD_PASSWORD: 'kibana-buildkite-build-bot-es-cloud-password',
};

const getSecret = async (client, id) => {
  const [accessResponse] = await client.accessSecretVersion({
    name: `projects/1003139005402/secrets/${id}/versions/latest`,
  });

  return accessResponse?.payload?.data?.toString();
};

export default async () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const client = new SecretManagerServiceClient();
  const envVars = Object.keys(GCP_SECRET_MAPPING).filter((key) => !(key in process.env));

  try {
    const values = await Promise.all(envVars.map((key) => getSecret(client, GCP_SECRET_MAPPING[key])));

    for (let i = 0; i < envVars.length; i++) {
      process.env[envVars[i]] = values[i];
    }
  } catch (ex) {
    console.error('Error bootstrapping secrets from GCP', ex);
    process.exit(1);
  }
};
