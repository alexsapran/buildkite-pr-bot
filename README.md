# Elastic Buildkite PR Bot

## Overview

- Triggers PR builds in Buildkite when a PR is opened, updated via commit, or a comment is present with a customizable trigger phrase.
- Multiple repos can be configured for a single instance of the app
- Can be set to only allow PRs to be triggered by users who:
  - Are in the elastic org
  - Have a configurable level of access to the given repo (e.g. admin or write)
  - Are on a defined allowlist
- Maps a static list of branches to builds in Buildkite
- Maps any standard tracked branches (e.g. master, 7.x, etc) to a templated build ID, so the configuration doesn't need to be updated after version bumps
- Passes various bits of information from the PR to Buildkite when the build is triggered, which get set as environment variables:
  - GITHUB_PR_OWNER
  - GITHUB_PR_REPO
  - GITHUB_PR_BRANCH
  - GITHUB_PR_TRIGGERED_SHA
  - GITHUB_PR_LABELS (comma-separated list)
  - GITHUB_PR_TRIGGER_COMMENT (on comment triggers only)
- Can set commit statuses when triggering builds

## Getting Started

### Requirements

- Node.js 14+

### Configuration

`cp .env.template .env` and edit.

See `src/defaultConfig.js` for the default app/repo configuration.

You can create a separate config file (.js or .json) and point to it with `APP_CONFIG` in your `.env`.

### Dependencies

`npm install`

### Run it

- `npm run start` to start the app
- `npm run watch` to automatically restart on code changes
- `npm run test` or `npm run test:watch` to run tests

### Configuration

#### All job configuration options available

All parameters are optional. At least one of `allow_org_users`,
`allowed_repo_permissions`, `allowed_list` must be set for some user to be able
to trigger PRs.

**enabled**

- Enables PR integration for this job
- Values: true or false
- Default: false

**build_on_commit**

- Triggers builds on new commits. This will also trigger a build when the PR is
  created. Draft PRs will be triggered as well.
- Values: true or false
- Default: true

**build_on_comment**

- Triggers build on comments that match
  `elastic.pull_request.trigger_comment_regex` (see below).
- Values: true or false
- Default: true

**target_branch**

- Only trigger PRs that target this branch
- Value: branch name, e.g. `master`
- Default: `<empty string>`

**allow_org_users**

- Allow anyone in Elastic org to trigger this job
- Value: true or false
- Default: false

**allowed_repo_permissions**

- Comma-separated list of desired permissions. Anyone with these permissions on
  this repo can trigger this job.
- Value: `admin,write,read`
- Default: `<empty string>`

**allowed_list**

- Comma-separated list of users who are able to trigger this job
- Value: `user1,user2,user3`
- Default: `<empty string>`

**labels**

- Comma-separated list of labels required to trigger this job. Only one of the
  specified labels must be present on the PR to trigger.
- Value: `Feature:cool-feature,Team:cool-team`
- Default: `<empty string>`

Currently, if you add a new label after PR creation, you'll need to comment or
commit to the PR to trigger a job that matches that label.

**skip_ci_label**

- A label that, when present on a PR, will cause automatic triggers to be
  skipped. The build can still be triggered manually with a comment.
- Value: `my-custom-label`
- Default: `skip-ci`

**trigger_comment_regex**

- A regular expression for matching comments posted on the PR for triggering
  builds. Only users who match the allow parameters above can trigger builds via
  comment.
- Value:
  [JavaScript-style](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
  regex
- Default: `(?:(?:buildkite\W+)?(?:build | test)\W+(?:this | it)) | ^retest$`

The other general requirements must also be satisfied for the build to trigger.
For example, if a certain label is required, sending the trigger phrase will
only trigger this build if the PR also contains that label. This lets you create
a general CI pipeline with some dynamic steps based on labels, but still have
that pipeline re-run if you comment with the trigger phrase.

If you'd also like to specify a second comment that will always trigger the
build, e.g. even if the labels don't match, see
`always_trigger_comment_regex` below.

Only the first line of the comment is considered when checking for the trigger
phrase.

If you add capture groups to your expression, the captured values will be passed
to your build as environment variables and build configuration parameters.

Example:

Given the regular expression:
`buildkite deploy (?<product>[a-z]+) to (?<location>[a-z]+)`

and the comment: `buildkite deploy myapp to production`

Then, `env.GITHUB_PR_COMMENT_VAR_PRODUCT` and
`env.GITHUB_PR_COMMENT_VAR_LOCATION` will be set on your build, with the values
`myapp` and `production`.

**always_trigger_comment_regex**

- A regular expression for matching comments posted on the PR for triggering
  builds. Will always trigger the build, even if other non-strict requirements
  are not satisfied (e.g. labels).
- Value:
  [JavaScript-style](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
  regex
- Default: `<empty string>`

Works like `trigger_comment_regex` above, but always
triggers the build. Certain requirements must always be satisfied, e.g. user
permissions and PR target branch.

For example, you might have a job with:

- `trigger_comment_regex` = `buildkite build this`
- `labels` = `["feature:maps"]`
- `always_trigger_comment_regex` = `buildkite run maps ci`

Buildkite will run this job only for PRs that have the label `feature:maps`, even
when you comment `buildkite build this`

However, if a user would like to run a one-off instance of the "maps" CI on a
different PR, they can still comment with `buildkite run maps ci`

**set_commit_status**

- Sets a github commit status of `pending` when the build is triggered. `commit_status_context` must also be set.
- Values: true or false
- Default: false

**commit_status_context**

- The github commit status context to use when setting commit statuses.
- Values: `any string`
- Default: `<empty string>`

**skip_ci_on_only_changed**

- An array of regular expressions for matching changed files in a PR. If all of the files in a PR match at least one regular expression, a build will not be triggered.
  If `set_commit_status` is set to `true`, it will set a commit status of `success`.
- Value: Array of
  [JavaScript-style](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
  regular expressions
- Default: `[]`

**always_require_ci_on_changed**

- An array of regular expressions for changed files that must always trigger CI. This is used to create exceptions to the rules set in `skip_ci_on_only_changed`.
- Value: Array of
  [JavaScript-style](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
  regular expressions
- Default: `[]`

As a concrete example:

You have `skip_ci_on_only_changed` set to `["\\.md$"]` to skip CI for PRs that only change documentation files.

You could have `always_require_ci_on_changed` set to `["^some/important/directory/.+\\.md$"]` to ensure that CI is always triggered for PRs that change documentation files in `some/important/directory`.

**enable_skippable_commits**

- Enable skipping of builds based on the changes present in individual commits.
- Value: true or false
- Default: false

On commit, the diff between that commit and the commit of the **most recent successful build** is compared against the `skip_ci_on_only_changed` and `always_require_ci_on_changed` regular expressions. If all of the files in the diff are skippable, the build is skipped.

**kibana_versions_check**

- Before triggering a build, check the target branch against branches in Kibana's `versions.json` file. If the branch is no longer open, skip the build and leave an error message via PR comment.
- Value: true or false
- Default: false

**kibana_build_reuse**

- Triggers builds with `KIBANA_BUILD_ID` whenever a Kibana distribution from a previous build can be re-used.
- Value: true or false
- Default: false

The diff between the current commit and the most recent successful build step in the branch's commit history (including the upstream) is compared to `kibana_build_reuse_regexes` and `skip_ci_on_only_changed`. If the build can be reused based on the diff, the following environment variables will be set when the build is triggered:

- KIBANA_BUILD_ID
- KIBANA_REUSABLE_BUILD_BUILD_ID
- KIBANA_REUSABLE_BUILD_JOB_ID
- KIBANA_REUSABLE_BUILD_JOB_URL

**kibana_build_reuse_pipeline_slugs**

- A list of pipeline slugs to use when looking for reusable build steps. e.g. `kibana-on-merge` and `kibana-pull-request`
- Value: Array of strings
- Default: `[]`

**kibana_build_reuse_regexes**

- A list of file path regexes for files that are known to not effect the build, i.e. changes to these files will still allow a build to be reused. These are added to `skip_ci_on_only_changed`, so they do not need to be set in both properties.
- Value: Value: Array of
  [JavaScript-style](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
  regular expressions
- Default: `[]`

**kibana_build_reuse_label**

- If this config is present, it makes the build reuse feature opt-in, via this label. If the config is missing, all PRs are candidates for build reuse.
- Value: `any string representing a github label`
- Default: `<empty string>`

**use_merge_commit** - _Experiemntal_

- Use the merge commit for the PR, if the PR is mergeable, rather than the HEAD commit. If the PR is not mergeable, e.g. in the case of conflicts, the HEAD commit will be used.
- Value: true or false
- Default: false
