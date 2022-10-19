const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const SECRET_PREFIX = process.env.GCP_SECRET_PREFIX ?? 'kibana-buildkite-pr-bot';

const GCP_SECRET_MAPPING: Record<string, string> = {
  GITHUB_TOKEN: `${SECRET_PREFIX}-github-token`,
  WEBHOOK_SECRET: `${SECRET_PREFIX}-webhook-secret`,
  BUILDKITE_TOKEN: `${SECRET_PREFIX}-buildkite-token`,
};

if (process.env.ENABLE_ES_CLOUD) {
  GCP_SECRET_MAPPING.ES_CLOUD_ID = `${SECRET_PREFIX}-es-cloud-id`;
  GCP_SECRET_MAPPING.ES_CLOUD_USERNAME = `${SECRET_PREFIX}-es-cloud-username`;
  GCP_SECRET_MAPPING.ES_CLOUD_PASSWORD = `${SECRET_PREFIX}-es-cloud-password`;
}

const getSecret = async (client, id) => {
  const [accessResponse] = await client.accessSecretVersion({
    name: `projects/${process.env.SECRETS_PROJECT_ID}/secrets/${id}/versions/latest`,
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
