## Public Blog Content Boundary

This repository is public. Blog posts may discuss personal AI settings, AI workflows, lessons learned, and trial-and-error notes, but must never include company-internal information or private information of any kind.

Posts are written in Korean by default. English technical identifiers, command names, model names, paths, and quoted error messages may remain in their original form when needed.

Treat this repository as a clean, public-only blog. Never assume previous sanitization is enough. Every change must be safe if read by anyone on the public internet.

Do not update this public repository with private material in posts, drafts, commits, commit messages, issues, pull requests, comments, screenshots, images, attachments, filenames, branch names, or generated build artifacts.

Do not include, summarize, anonymize, hint at, or derive content from:

- Any current or former employer's work, customers, meetings, reports, tickets, repositories, credentials, or internal operations
- Company organization details, team structures, roles, reporting lines, internal schedules, staffing, performance notes, or business planning
- User/customer/employee personal information, including names, email addresses, phone numbers, account IDs, IP addresses, device IDs, logs, screenshots, or any other identifiable or linkable data
- Product information that is not already public, including roadmap, architecture, implementation details, incidents, defects, metrics, customer usage, benchmarks, or release plans
- Any non-public work product details, source code, UI, query languages, search indexes, runtime data, issue IDs, screenshots, customer environments, or implementation history
- Internal AI memory systems, private session state, unpublished work logs, confidential prompts, or local automation details
- Any content copied from private repositories, work documents, email, issue trackers, wikis, cloud drives, work chat channels, or local server files

Public safety applies to the whole repository, including tracked source files, generated pages, metadata, assets, filenames, git history, workflow logs, and deployment artifacts.

Before creating or editing any post, run a content review for company, organization, personal information, and product leakage. If a draft depends on work context, rewrite it into a general personal learning note with no identifiable company, organization, person, product, customer, repository, path, issue, data, or operational detail. When unsure, exclude it.

Before every commit or push:

- Review `git status` and the exact staged diff.
- Search source files for company names, product names, customer names, personal information, credentials, tokens, private repository names, internal issue IDs, server details, and local paths.
- Inspect screenshots, images, attachments, and other non-text assets before adding them.
- Build the site and scan the generated output before publishing.
- Stop immediately if any content could identify a company, organization, person, product, customer, repository, internal system, or private work context.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
