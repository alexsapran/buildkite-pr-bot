import { Client } from '@elastic/elasticsearch';
import { Build } from './models/buildkite/build';
import { Job } from './models/buildkite/job';

export type JobFromIngest = Job & {
  build: {
    id: string;
    number: number;
    commit: string;
    branch: string;
  };
  pipeline: {
    slug: string;
    name: string;
  };
};

export class BuildkiteIngestData {
  es: Client;

  constructor(es: Client = null) {
    this.es =
      es ??
      new Client({
        cloud: { id: process.env.ES_CLOUD_ID },
        auth: {
          username: process.env.ES_CLOUD_USERNAME,
          password: process.env.ES_CLOUD_PASSWORD,
        },
      });
  }

  getBuildJobsForCommits = async (commits: string[], pipelineSlugs: string[]) => {
    const buildJobs = await this.es.search<JobFromIngest>({
      index: 'buildkite-jobs',
      body: {
        sort: [
          {
            created_at: 'desc',
          },
        ],
        query: {
          bool: {
            must: [
              {
                terms: {
                  'build.commit.keyword': commits,
                },
              },
              {
                match: {
                  'step_key.keyword': 'build',
                },
              },
              {
                terms: {
                  'pipeline.slug.keyword': pipelineSlugs,
                },
              },
            ],
          },
        },
      },
    });

    const jobs = buildJobs.hits.hits.map((hit) => hit._source);
    jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return jobs;
  };

  getBuildsForCommits = async (commits: string[], pipelineSlugs: string[]) => {
    const buildsFromEs = await this.es.search<Build>({
      index: 'buildkite-builds',
      body: {
        sort: [
          {
            created_at: 'desc',
          },
        ],
        query: {
          bool: {
            must: [
              {
                terms: {
                  'commit.keyword': commits,
                },
              },
              {
                terms: {
                  'pipeline.slug.keyword': pipelineSlugs,
                },
              },
            ],
          },
        },
      },
    });

    const builds = buildsFromEs.hits.hits.map((hit) => hit._source);
    builds.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return builds;
  };
}
