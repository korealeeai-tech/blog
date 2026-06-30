# KoreaLee AI Tech Blog

Public Astro blog for Korean notes on AI settings, workflows, and lessons learned.

## Content Boundary

This repository is public. Do not include company organization details, user/customer/employee personal information, private product information, source code, operational details, credentials, private work context, or non-public work product information in posts, drafts, commits, commit messages, issues, pull requests, comments, screenshots, assets, filenames, or build artifacts.

Posts are written in Korean by default. Technical identifiers may remain in English when needed.

Posts must read like a real person explaining a concrete experience or judgment. Avoid generic AI-like summaries, unsupported claims, and unnecessary strong statements. For changeable facts such as dates, versions, prices, policies, product behavior, and release status, state the checked date/version and separate verified facts from assumptions or opinions.

Every published post must include one safe representative image. Architecture or concept posts should actively use generated images, synthesized diagrams, or hand-made diagrams, with captions that make clear whether the image is conceptual or evidence from an actual flow. Posts may include cropped/redacted code or runtime screenshots when they help explain the actual working flow. Any screenshot or image must be inspected first and must be cropped, blurred, mosaiced, redacted, retaken, or omitted if it contains private or identifiable content. Filenames, alt text, captions, and metadata must also be safe for a fully public repository.

Before every commit or push, review the staged diff, scan source and generated output, and confirm the content is safe for a fully public repository. If anything could identify a company, organization, person, product, customer, repository, internal system, or private work context, do not publish it.

## Development

Use Node 22.12 or newer.

```bash
npm install
npm run dev
npm run build
```

For the current server, local validation can use temporary Node 22:

```bash
npx -y -p node@22 npm run build
```

## Deployment

The site is configured for GitHub Pages project hosting:

- `site`: `https://korealeeai-tech.github.io`
- `base`: `/blog`
- production URL: `https://korealeeai-tech.github.io/blog/`

Pushes to `main` run `.github/workflows/deploy.yml`.
