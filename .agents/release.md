# Release

This package uses Changesets and npm Trusted Publishing.

## Validate

```bash
corepack enable
corepack pnpm release:check
```

## Trusted Publishing

Before the first tag publish, configure npm trusted publishing for the GitHub Actions workflow:

```bash
npm trust github @eliya-oss/agent-slack --repo Newbie012/agent-slack --file release.yml --allow-publish
```

The workflow uses OIDC with `id-token: write`; it does not use `NODE_AUTH_TOKEN` or a long-lived npm token.

## Publish

```bash
corepack pnpm changeset
corepack pnpm version-packages
corepack pnpm release:check
git tag v0.1.0
git push origin main --tags
```
