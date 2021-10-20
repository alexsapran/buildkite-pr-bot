export class PrConfig {
  pipelineSlug: string;
  repoOwner: string;
  repoName: string;

  allow_org_users = false;
  build_on_comment = true;
  build_on_commit = true;
  // cancel_in_progress_builds_on_update = false; // TODO we can likely remove this and rely on Buildkite's Pipeline settings
  enabled = false;

  allowed_repo_permissions?: Array<string>;
  allowed_list?: Array<string>;

  target_branch = '';
  trigger_comment_regex = '^(?:(?:buildkite\\W+)?(?:build|test)\\W+(?:this|it))|^retest$';

  labels?: Array<string>;

  always_trigger_comment_regex = '';

  skip_ci_label = ''; // for backwards compatibility with old version
  skip_ci_labels: Array<string> = ['skip-ci'];

  set_commit_status = false;
  commit_status_context = '';

  constructor(config: PrConfig = null) {
    if (config) {
      Object.assign(this, config);

      // Just for backwards compatibility
      if (config.skip_ci_label) {
        this.skip_ci_labels = [config.skip_ci_label];
      }
    }
  }
}
