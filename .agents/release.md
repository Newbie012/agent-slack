# Release

This package uses Changesets and npm Trusted Publishing. Releases are automated
by the Changesets GitHub Action in `.github/workflows/release.yml`.

## Validate

```bash
corepack enable
corepack pnpm release:check
```

## Trusted Publishing

npm trusted publishing is bound to the `release.yml` workflow. Configure it once:

```bash
npm trust github @eliya-oss/agent-slack --repo Newbie012/agent-slack --file release.yml --allow-publish
```

The workflow uses OIDC with `id-token: write`; it does not use `NODE_AUTH_TOKEN`
or a long-lived npm token. Because the trust is bound to `release.yml`,
publishing must stay in that file.

## Flow

1. Add a changeset with your change:

   ```bash
   corepack pnpm changeset
   ```

2. Commit and push to `main`. The Release workflow opens (or updates) a
   **"Version packages"** PR that bumps the version and folds pending changesets
   into `CHANGELOG.md`.
3. Merge the "Version packages" PR. The workflow runs again with no changesets
   left, so it runs `release:publish` (`changeset publish`), which publishes to
   npm via trusted publishing and creates the `v*` git tag.

## Requirements

- Repo setting **Settings > Actions > General > "Allow GitHub Actions to create
  and approve pull requests"** must be enabled so the workflow can open the
  Version packages PR.

## Manual fallback

If you ever need to publish by hand:

```bash
corepack pnpm version-packages
corepack pnpm release:check
corepack pnpm exec changeset publish
```
