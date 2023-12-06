module.exports = () => ({
  id: '288696904',
  name: 'issue_comment',
  payload: {
    "action": "created",
    "issue": {
      "url": "https://api.github.com/repos/elastic/kibana/issues/172421",
      "repository_url": "https://api.github.com/repos/elastic/kibana",
      "labels_url": "https://api.github.com/repos/elastic/kibana/issues/172421/labels{/name}",
      "comments_url": "https://api.github.com/repos/elastic/kibana/issues/172421/comments",
      "events_url": "https://api.github.com/repos/elastic/kibana/issues/172421/events",
      "html_url": "https://github.com/elastic/kibana/pull/172421",
      "id": 2021843198,
      "node_id": "PR_kwDOAHeGUM5g8yuK",
      "number": 172421,
      "title": "test commit",
      "user": {
        "login": "Ikuni17",
        "id": 14021797,
        "node_id": "MDQ6VXNlcjE0MDIxNzk3",
        "avatar_url": "https://avatars.githubusercontent.com/u/14021797?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/Ikuni17",
        "html_url": "https://github.com/Ikuni17",
        "followers_url": "https://api.github.com/users/Ikuni17/followers",
        "following_url": "https://api.github.com/users/Ikuni17/following{/other_user}",
        "gists_url": "https://api.github.com/users/Ikuni17/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/Ikuni17/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/Ikuni17/subscriptions",
        "organizations_url": "https://api.github.com/users/Ikuni17/orgs",
        "repos_url": "https://api.github.com/users/Ikuni17/repos",
        "events_url": "https://api.github.com/users/Ikuni17/events{/privacy}",
        "received_events_url": "https://api.github.com/users/Ikuni17/received_events",
        "type": "User",
        "site_admin": false
      },
      "labels": [

      ],
      "state": "open",
      "locked": false,
      "assignee": null,
      "assignees": [

      ],
      "milestone": null,
      "comments": 1,
      "created_at": "2023-12-02T04:02:07Z",
      "updated_at": "2023-12-06T03:42:19Z",
      "closed_at": null,
      "author_association": "CONTRIBUTOR",
      "active_lock_reason": null,
      "draft": true,
      "pull_request": {
        "url": "https://api.github.com/repos/elastic/kibana/pulls/172421",
        "html_url": "https://github.com/elastic/kibana/pull/172421",
        "diff_url": "https://github.com/elastic/kibana/pull/172421.diff",
        "patch_url": "https://github.com/elastic/kibana/pull/172421.patch",
        "merged_at": null
      },
      "body": "## Summary\r\n\r\nSummarize your PR. If it involves visual changes include a screenshot or gif.\r\n\r\n\r\n### Checklist\r\n\r\nDelete any items that are not applicable to this PR.\r\n\r\n- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/packages/kbn-i18n/README.md)\r\n- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials\r\n- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios\r\n- [ ] [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner/1) was used on any tests changed\r\n- [ ] Any UI touched in this PR is usable by keyboard only (learn more about [keyboard accessibility](https://webaim.org/techniques/keyboard/))\r\n- [ ] Any UI touched in this PR does not create any new axe failures (run axe in browser: [FF](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/), [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US))\r\n- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)\r\n- [ ] This renders correctly on smaller devices using a responsive layout. (You can test this [in your browser](https://www.browserstack.com/guide/responsive-testing-on-local-server))\r\n- [ ] This was checked for [cross-browser compatibility](https://www.elastic.co/support/matrix#matrix_browsers)\r\n\r\n\r\n### Risk Matrix\r\n\r\nDelete this section if it is not applicable to this PR.\r\n\r\nBefore closing this PR, invite QA, stakeholders, and other developers to identify risks that should be tested prior to the change/feature release.\r\n\r\nWhen forming the risk matrix, consider some of the following examples and how they may potentially impact the change:\r\n\r\n| Risk                      | Probability | Severity | Mitigation/Notes        |\r\n|---------------------------|-------------|----------|-------------------------|\r\n| Multiple Spaces&mdash;unexpected behavior in non-default Kibana Space. | Low | High | Integration tests will verify that all features are still supported in non-default Kibana Space and when user switches between spaces. |\r\n| Multiple nodes&mdash;Elasticsearch polling might have race conditions when multiple Kibana nodes are polling for the same tasks. | High | Low | Tasks are idempotent, so executing them multiple times will not result in logical error, but will degrade performance. To test for this case we add plenty of unit tests around this logic and document manual testing procedure. |\r\n| Code should gracefully handle cases when feature X or plugin Y are disabled. | Medium | High | Unit tests will verify that any feature flag or plugin combination still results in our service operational. |\r\n| [See more potential risk examples](https://github.com/elastic/kibana/blob/main/RISK_MATRIX.mdx) |\r\n\r\n\r\n### For maintainers\r\n\r\n- [ ] This was checked for breaking API changes and was [labeled appropriately](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)\r\n",
      "reactions": {
        "url": "https://api.github.com/repos/elastic/kibana/issues/172421/reactions",
        "total_count": 0,
        "+1": 0,
        "-1": 0,
        "laugh": 0,
        "hooray": 0,
        "confused": 0,
        "heart": 0,
        "rocket": 0,
        "eyes": 0
      },
      "timeline_url": "https://api.github.com/repos/elastic/kibana/issues/172421/timeline",
      "performed_via_github_app": null,
      "state_reason": null
    },
    "comment": {
      "url": "https://api.github.com/repos/elastic/kibana/issues/comments/1842034990",
      "html_url": "https://github.com/elastic/kibana/pull/172421#issuecomment-1842034990",
      "issue_url": "https://api.github.com/repos/elastic/kibana/issues/172421",
      "id": 1842034990,
      "node_id": "IC_kwDOAHeGUM5tyzku",
      "user": {
        "login": "Ikuni17",
        "id": 14021797,
        "node_id": "MDQ6VXNlcjE0MDIxNzk3",
        "avatar_url": "https://avatars.githubusercontent.com/u/14021797?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/Ikuni17",
        "html_url": "https://github.com/Ikuni17",
        "followers_url": "https://api.github.com/users/Ikuni17/followers",
        "following_url": "https://api.github.com/users/Ikuni17/following{/other_user}",
        "gists_url": "https://api.github.com/users/Ikuni17/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/Ikuni17/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/Ikuni17/subscriptions",
        "organizations_url": "https://api.github.com/users/Ikuni17/orgs",
        "repos_url": "https://api.github.com/users/Ikuni17/repos",
        "events_url": "https://api.github.com/users/Ikuni17/events{/privacy}",
        "received_events_url": "https://api.github.com/users/Ikuni17/received_events",
        "type": "User",
        "site_admin": false
      },
      "created_at": "2023-12-06T03:42:19Z",
      "updated_at": "2023-12-06T03:42:19Z",
      "author_association": "CONTRIBUTOR",
      "body": "/ci",
      "reactions": {
        "url": "https://api.github.com/repos/elastic/kibana/issues/comments/1842034990/reactions",
        "total_count": 0,
        "+1": 0,
        "-1": 0,
        "laugh": 0,
        "hooray": 0,
        "confused": 0,
        "heart": 0,
        "rocket": 0,
        "eyes": 0
      },
      "performed_via_github_app": null
    },
    "repository": {
      "id": 7833168,
      "node_id": "MDEwOlJlcG9zaXRvcnk3ODMzMTY4",
      "name": "kibana",
      "full_name": "elastic/kibana",
      "private": false,
      "owner": {
        "login": "elastic",
        "id": 6764390,
        "node_id": "MDEyOk9yZ2FuaXphdGlvbjY3NjQzOTA=",
        "avatar_url": "https://avatars.githubusercontent.com/u/6764390?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/elastic",
        "html_url": "https://github.com/elastic",
        "followers_url": "https://api.github.com/users/elastic/followers",
        "following_url": "https://api.github.com/users/elastic/following{/other_user}",
        "gists_url": "https://api.github.com/users/elastic/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/elastic/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/elastic/subscriptions",
        "organizations_url": "https://api.github.com/users/elastic/orgs",
        "repos_url": "https://api.github.com/users/elastic/repos",
        "events_url": "https://api.github.com/users/elastic/events{/privacy}",
        "received_events_url": "https://api.github.com/users/elastic/received_events",
        "type": "Organization",
        "site_admin": false
      },
      "html_url": "https://github.com/elastic/kibana",
      "description": "Your window into the Elastic Stack",
      "fork": false,
      "url": "https://api.github.com/repos/elastic/kibana",
      "forks_url": "https://api.github.com/repos/elastic/kibana/forks",
      "keys_url": "https://api.github.com/repos/elastic/kibana/keys{/key_id}",
      "collaborators_url": "https://api.github.com/repos/elastic/kibana/collaborators{/collaborator}",
      "teams_url": "https://api.github.com/repos/elastic/kibana/teams",
      "hooks_url": "https://api.github.com/repos/elastic/kibana/hooks",
      "issue_events_url": "https://api.github.com/repos/elastic/kibana/issues/events{/number}",
      "events_url": "https://api.github.com/repos/elastic/kibana/events",
      "assignees_url": "https://api.github.com/repos/elastic/kibana/assignees{/user}",
      "branches_url": "https://api.github.com/repos/elastic/kibana/branches{/branch}",
      "tags_url": "https://api.github.com/repos/elastic/kibana/tags",
      "blobs_url": "https://api.github.com/repos/elastic/kibana/git/blobs{/sha}",
      "git_tags_url": "https://api.github.com/repos/elastic/kibana/git/tags{/sha}",
      "git_refs_url": "https://api.github.com/repos/elastic/kibana/git/refs{/sha}",
      "trees_url": "https://api.github.com/repos/elastic/kibana/git/trees{/sha}",
      "statuses_url": "https://api.github.com/repos/elastic/kibana/statuses/{sha}",
      "languages_url": "https://api.github.com/repos/elastic/kibana/languages",
      "stargazers_url": "https://api.github.com/repos/elastic/kibana/stargazers",
      "contributors_url": "https://api.github.com/repos/elastic/kibana/contributors",
      "subscribers_url": "https://api.github.com/repos/elastic/kibana/subscribers",
      "subscription_url": "https://api.github.com/repos/elastic/kibana/subscription",
      "commits_url": "https://api.github.com/repos/elastic/kibana/commits{/sha}",
      "git_commits_url": "https://api.github.com/repos/elastic/kibana/git/commits{/sha}",
      "comments_url": "https://api.github.com/repos/elastic/kibana/comments{/number}",
      "issue_comment_url": "https://api.github.com/repos/elastic/kibana/issues/comments{/number}",
      "contents_url": "https://api.github.com/repos/elastic/kibana/contents/{+path}",
      "compare_url": "https://api.github.com/repos/elastic/kibana/compare/{base}...{head}",
      "merges_url": "https://api.github.com/repos/elastic/kibana/merges",
      "archive_url": "https://api.github.com/repos/elastic/kibana/{archive_format}{/ref}",
      "downloads_url": "https://api.github.com/repos/elastic/kibana/downloads",
      "issues_url": "https://api.github.com/repos/elastic/kibana/issues{/number}",
      "pulls_url": "https://api.github.com/repos/elastic/kibana/pulls{/number}",
      "milestones_url": "https://api.github.com/repos/elastic/kibana/milestones{/number}",
      "notifications_url": "https://api.github.com/repos/elastic/kibana/notifications{?since,all,participating}",
      "labels_url": "https://api.github.com/repos/elastic/kibana/labels{/name}",
      "releases_url": "https://api.github.com/repos/elastic/kibana/releases{/id}",
      "deployments_url": "https://api.github.com/repos/elastic/kibana/deployments",
      "created_at": "2013-01-26T04:00:59Z",
      "updated_at": "2023-12-06T01:01:18Z",
      "pushed_at": "2023-12-06T03:10:29Z",
      "git_url": "git://github.com/elastic/kibana.git",
      "ssh_url": "git@github.com:elastic/kibana.git",
      "clone_url": "https://github.com/elastic/kibana.git",
      "svn_url": "https://github.com/elastic/kibana",
      "homepage": "https://www.elastic.co/products/kibana",
      "size": 5868176,
      "stargazers_count": 18953,
      "watchers_count": 18953,
      "language": "TypeScript",
      "has_issues": true,
      "has_projects": true,
      "has_downloads": true,
      "has_wiki": false,
      "has_pages": false,
      "has_discussions": true,
      "forks_count": 7968,
      "mirror_url": null,
      "archived": false,
      "disabled": false,
      "open_issues_count": 10132,
      "license": {
        "key": "other",
        "name": "Other",
        "spdx_id": "NOASSERTION",
        "url": null,
        "node_id": "MDc6TGljZW5zZTA="
      },
      "allow_forking": true,
      "is_template": false,
      "web_commit_signoff_required": false,
      "topics": [
        "dashboards",
        "elasticsearch",
        "hacktoberfest",
        "kibana",
        "metrics",
        "observability",
        "visualizations"
      ],
      "visibility": "public",
      "forks": 7968,
      "open_issues": 10132,
      "watchers": 18953,
      "default_branch": "main",
      "custom_properties": {
        "security_level": "high"
      }
    },
    "organization": {
      "login": "elastic",
      "id": 6764390,
      "node_id": "MDEyOk9yZ2FuaXphdGlvbjY3NjQzOTA=",
      "url": "https://api.github.com/orgs/elastic",
      "repos_url": "https://api.github.com/orgs/elastic/repos",
      "events_url": "https://api.github.com/orgs/elastic/events",
      "hooks_url": "https://api.github.com/orgs/elastic/hooks",
      "issues_url": "https://api.github.com/orgs/elastic/issues",
      "members_url": "https://api.github.com/orgs/elastic/members{/member}",
      "public_members_url": "https://api.github.com/orgs/elastic/public_members{/member}",
      "avatar_url": "https://avatars.githubusercontent.com/u/6764390?v=4",
      "description": ""
    },
    "enterprise": {
      "id": 177,
      "slug": "elastic",
      "name": "Elastic",
      "node_id": "MDEwOkVudGVycHJpc2UxNzc=",
      "avatar_url": "https://avatars.githubusercontent.com/b/177?v=4",
      "description": "",
      "website_url": "https://elastic.co",
      "html_url": "https://github.com/enterprises/elastic",
      "created_at": "2019-05-22T23:05:33Z",
      "updated_at": "2022-12-23T17:39:16Z"
    },
    "sender": {
      "login": "Ikuni17",
      "id": 14021797,
      "node_id": "MDQ6VXNlcjE0MDIxNzk3",
      "avatar_url": "https://avatars.githubusercontent.com/u/14021797?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/Ikuni17",
      "html_url": "https://github.com/Ikuni17",
      "followers_url": "https://api.github.com/users/Ikuni17/followers",
      "following_url": "https://api.github.com/users/Ikuni17/following{/other_user}",
      "gists_url": "https://api.github.com/users/Ikuni17/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/Ikuni17/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/Ikuni17/subscriptions",
      "organizations_url": "https://api.github.com/users/Ikuni17/orgs",
      "repos_url": "https://api.github.com/users/Ikuni17/repos",
      "events_url": "https://api.github.com/users/Ikuni17/events{/privacy}",
      "received_events_url": "https://api.github.com/users/Ikuni17/received_events",
      "type": "User",
      "site_admin": false
    }
  }
});