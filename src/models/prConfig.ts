export class PrConfig {
  pipelineSlug?: string;
  pipeline_slug?: string;
  repoOwner: string;
  repoName: string;

  allow_org_users = false;
  build_on_comment = true;
  build_on_commit = true;
  // cancel_in_progress_builds_on_update = false; // TODO we can likely remove this and rely on Buildkite's Pipeline settings
  enabled = false;

  allowed_repo_permissions?: null | Array<string>;
  allowed_list?: null | Array<string>;

  target_branch: string | Array<string> = '';
  trigger_comment_regex = '^(?:(?:buildkite\\W+)?(?:build|test)\\W+(?:this|it))|^retest$|^\/ci$';
  trigger_comment_regex_flags = 'i';

  labels?: Array<string>;

  always_trigger_comment_regex = '';
  always_trigger_comment_regex_flags = 'i';

  skip_ci_label = ''; // for backwards compatibility with old version
  skip_ci_labels: Array<string> = ['skip-ci'];

  skip_target_branches: Array<string> = [];

  set_commit_status = false;
  commit_status_context = '';

  skip_ci_on_only_changed: Array<string> = [];
  always_require_ci_on_changed: Array<string> = [];
  skippable_changes_beta_label = 'ci:skip-when-possible';
  enable_skippable_commits = false;

  use_merge_commit = false;
  fail_on_not_mergable = false;

  kibana_build_reuse = false;
  kibana_build_reuse_pipeline_slugs: string[] = [];
  kibana_build_reuse_regexes: Array<string> = [];
  kibana_build_reuse_label = '';

  kibana_versions_check = false;

  cancel_intermediate_builds = false;
  cancel_intermediate_builds_on_comment = true; // This one is only relevant if cancel_intermediate_builds=true

  always_trigger_branch = '';

  constructor(config: PrConfig = null) {
    if (config) {
      Object.assign(this, config);

      // Just for backwards compatibility
      if (config.skip_ci_label) {
        this.skip_ci_labels = [config.skip_ci_label];
      }

      if (config.pipelineSlug) {
        this.pipeline_slug = config.pipelineSlug;
      }
    }
  }
}

export class OrgWidePrConfig extends PrConfig {
  repositories: Array<string> = [];
}
