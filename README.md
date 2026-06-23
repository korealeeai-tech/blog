# KoreaLee AI Tech Blog

Public Astro blog for Korean notes on AI settings, workflows, and lessons learned.

## Content Boundary

This repository is public. Do not include company organization details, user/customer/employee personal information, private product information, source code, operational details, credentials, private work context, or non-public work product information in posts, drafts, commits, commit messages, issues, pull requests, comments, screenshots, assets, filenames, or build artifacts.

Posts are written in Korean by default. Technical identifiers may remain in English when needed.

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
