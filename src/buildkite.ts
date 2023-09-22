import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface BuildkiteTriggerBuildParams {
  commit: string; // TODO triggered commit?
  branch: string;
  env: Record<string, string>;
  pull_request_base_branch: string;
  pull_request_id: string | number;
  pull_request_repository: string;
}

// Note: There's actually a lot more available in this response
// It looks like most/all of this: https://buildkite.com/docs/apis/rest-api/builds#get-a-build
export interface BuildkiteBuild {
  id: string;
  number: number;
  url: string;
  web_url: string;
  state: string;
  message: string;
  commit: string;
}

export default class Buildkite {
  http: AxiosInstance;
  agentHttp: AxiosInstance;
  buildkiteOrg = process.env.BUILDKITE_ORG ?? 'elastic';

  constructor() {
    const BUILDKITE_BASE_URL = process.env.BUILDKITE_BASE_URL || 'https://api.buildkite.com';
    const BUILDKITE_TOKEN = process.env.BUILDKITE_TOKEN;

    const BUILDKITE_AGENT_BASE_URL = process.env.BUILDKITE_AGENT_BASE_URL || 'https://agent.buildkite.com/v3';
    const BUILDKITE_AGENT_TOKEN = process.env.BUILDKITE_AGENT_TOKEN;

    this.http = axios.create({
      baseURL: BUILDKITE_BASE_URL,
      headers: {
        Authorization: `Bearer ${BUILDKITE_TOKEN}`,
      },
    });

    this.agentHttp = axios.create({
      baseURL: BUILDKITE_AGENT_BASE_URL,
      headers: {
        Authorization: `Token ${BUILDKITE_AGENT_TOKEN}`,
      },
    });
  }

  async get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    try {
      return await this.http.get<T, R>(url, config);
    } catch (ex: any) {
      if (ex.isAxiosError) {
        ex.config = { REDACTED: 'REDACTED' };
        ex.request = { REDACTED: 'REDACTED' };
        ex.response = { REDACTED: 'REDACTED' };
      }
      throw ex;
    }
  }

  async post<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R> {
    try {
      return await this.http.post<T, R>(url, data, config);
    } catch (ex: any) {
      if (ex.isAxiosError) {
        ex.config = { REDACTED: 'REDACTED' };
        ex.request = { REDACTED: 'REDACTED' };
        ex.response = { REDACTED: 'REDACTED' };
      }
      throw ex;
    }
  }

  async put<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R> {
    try {
      return await this.http.put<T, R>(url, data, config);
    } catch (ex: any) {
      if (ex.isAxiosError) {
        ex.config = { REDACTED: 'REDACTED' };
        ex.request = { REDACTED: 'REDACTED' };
        ex.response = { REDACTED: 'REDACTED' };
      }
      throw ex;
    }
  }

  // https://buildkite.com/docs/apis/rest-api/builds#create-a-build
  triggerBuild = async (pipelineSlug: string, options: BuildkiteTriggerBuildParams): Promise<BuildkiteBuild> => {
    const url = `v2/organizations/${this.buildkiteOrg}/pipelines/${pipelineSlug}/builds`;

    return (await this.post(url, options)).data;
  };

  // https://buildkite.com/docs/apis/rest-api/builds#list-builds-for-a-pipeline
  getRunningBuilds = async (pipelineSlug: string, branch: string): Promise<BuildkiteBuild[]> => {
    const url = `v2/organizations/${this.buildkiteOrg}/pipelines/${pipelineSlug}/builds?branch=${encodeURIComponent(
      branch
    )}&state[]=scheduled&state[]=running&state[]=failing`;

    return (await this.get(url)).data;
  };

  // https://buildkite.com/docs/apis/rest-api/builds#cancel-a-build
  cancelBuild = async (pipelineSlug: string, buildNumber: number): Promise<void> => {
    const url = `v2/organizations/${this.buildkiteOrg}/pipelines/${pipelineSlug}/builds/${buildNumber}/cancel`;

    await this.put(url);
  };
}
