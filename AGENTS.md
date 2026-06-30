## Public Blog Content Boundary

This repository is public. Blog posts may discuss personal AI settings, AI workflows, lessons learned, and trial-and-error notes, but must never include company-internal information or private information of any kind.

Posts are written in Korean by default. English technical identifiers, command names, model names, paths, and quoted error messages may remain in their original form when needed.

Treat this repository as a clean, public-only blog. Never assume previous sanitization is enough. Every change must be safe if read by anyone on the public internet.

## Writing Rules

These rules are mandatory for every new post and every revision of an existing post.

Write in a natural human voice. Prefer experience-based explanation, concrete judgment, and smooth transitions over generic AI-like summaries, excessive bullet lists, or unsupported claims.

Use this default structure unless the topic clearly needs another shape: problem or trigger, why it mattered, what was checked or tried, decision criteria, result, limits and cautions. Tutorial posts should use prerequisites, steps followed, checkpoints, failures or cautions, and wrap-up.

Avoid creating confusion with inaccurate statements. For dates, versions, prices, policies, product behavior, release status, and other changeable facts, state the writing date or checked version and cite the source or evidence used. Separate facts, interpretations, assumptions, and personal opinions. If something was not verified, say so or leave it out.

When a post relies on official documentation to explain a feature, policy, or behavior, do not stop at a link and checked date. Include a short necessary excerpt from the original text, then separate the Korean interpretation, the judgment applied in the post, and any limits of the verification. Do not reproduce long passages from documentation.

When writing about AI tools, do not overstate capability. Explain what AI helped with and what still required human review, source checking, or validation.

Each substantial post should naturally include at least one of these: what was checked, scope and limits, easy-to-misread points, or remaining cautions.

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

Every published post must include one safe representative image through `heroImage`. For architecture or concept explanations, actively use generated images, synthesized diagrams, or hand-made diagrams, but make clear in the caption or nearby text when the image is a concept diagram rather than implementation proof. When creating an explanatory image or diagram for a Korean post, write the text inside the image in Korean where practical, except for technical identifiers, code, commands, product names, or terms that should remain in their original form.

When explaining an actual working flow, it is acceptable to include a cropped screenshot of a small code area or a redacted runtime screen if it materially improves understanding. Prefer clean public examples, public documentation, newly created local demo material, or safely redacted actual screens. Do not capture private work systems, private documents, private repositories, dashboards, issue trackers, emails, chat tools, account pages, internal URLs, browser tabs, usernames, device names, tokens, keys, logs, or any other identifiable context.

SecondBrain Graph screenshots may be used when they show the actual concept in operation, but product, company, customer, personal, internal path, task name, raw log, queue, schedule, account, and private node details must be hidden as much as possible.

Before adding any screenshot or image:

- Inspect it at original size before committing.
- Crop, blur, redact, or retake it so no private or identifiable content is visible.
- Use mosaic/redaction when blur may still leave text or structure inferable.
- Remove or avoid metadata that could expose private device, account, path, location, timestamp, or tool details.
- Use safe filenames, alt text, captions, and surrounding prose that do not reveal private context.
- Explain what the image shows and, when needed, what it does not prove.
- If a private detail cannot be safely removed or if safety is uncertain, omit the image.
- If no safe representative image can be created, do not publish the post yet.

Before creating or editing any post, run a content review for company, organization, personal information, and product leakage. If a draft depends on work context, rewrite it into a general personal learning note with no identifiable company, organization, person, product, customer, repository, path, issue, data, or operational detail. When unsure, exclude it.

Before every commit or push:

- Review `git status` and the exact staged diff.
- Search source files for company names, product names, customer names, personal information, credentials, tokens, private repository names, internal issue IDs, server details, and local paths.
- Inspect screenshots, images, attachments, and other non-text assets before adding them.
- Build the site and scan the generated output before publishing.
- Check that the post follows the writing rules: human voice, clear evidence boundary, no unnecessary incorrect statement, and no unsupported strong claims.
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
