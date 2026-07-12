# Releasing intent-link

This guide is for the package maintainers. Publishing uses npm trusted publishing through GitHub Actions and OIDC, so no long-lived `NPM_TOKEN` is required.

## 1. Choose and set the version

Use semantic versioning:

- Patch (`1.0.9` to `1.0.10`): bug fixes and compatible improvements.
- Minor (`1.0.9` to `1.1.0`): compatible new functionality.
- Major (`1.0.9` to `2.0.0`): breaking API changes.

Update `package.json` and `package-lock.json` together. For a patch release:

```bash
npm version patch --no-git-tag-version
```

Alternatively, replace `patch` with `minor` or `major`. Do not manually create a Git tag yet.

Add the release notes to the matching version section in `CHANGELOG.md`.

## 2. Verify the library

From the library repository:

```bash
npm ci
npm run check:all
npm pack --dry-run
```

`check:all` runs the unit tests, production build, and Playwright browser tests. Review the output of `npm pack --dry-run` and confirm that only the intended documentation, package metadata, and compiled `dist` files will be published.

## 3. Test the package in a local application

Create the same archive format that npm will publish:

```bash
npm pack
```

This creates `intent-link-<version>.tgz` in the library repository. Install that archive in the local test application using its absolute path:

```bash
cd "/path/to/ecommerce-project"
npm uninstall intent-link
npm install "/absolute/path/to/intent-link-<version>.tgz"
npm list intent-link
npm run dev
```

Avoid `--force` unless npm reports a peer-dependency conflict that has been investigated. Test desktop mouse behavior, mobile scrolling, responsive or hidden links, dense pages, `IntentLink`, custom targets using `useIntentTarget`, navigation, and network-prefetch behavior.

The generated `.tgz` file is ignored by Git and excluded from npm packages.

## 4. Commit and push the release

Return to the library repository and review the changes:

```bash
git status
git diff
```

Commit and push the version, changelog, and code changes:

```bash
git add .
git commit -m "Release v<version>"
git push origin main
```

Replace `main` if the repository's default branch has a different name.

## 5. Trigger npm publishing

Create a tag that exactly matches the version in `package.json`, then push it:

```bash
git tag v<version>
git push origin v<version>
```

For example, package version `1.0.10` requires tag `v1.0.10`.

Pushing the tag starts `.github/workflows/publish.yml`. The workflow:

1. Verifies that the tag matches `package.json`.
2. Installs dependencies and Chromium.
3. Runs the complete test and build suite.
4. Inspects the npm package contents.
5. Publishes through npm trusted publishing.

If the tag and package version differ, publishing stops. A version already published to npm cannot be reused.

## 6. Confirm the release

Check the GitHub Actions page and wait for the publish workflow to succeed. Then verify npm:

```bash
npm view intent-link version
```

## Quick reference

```bash
# In the library repository
npm version patch --no-git-tag-version
# Update CHANGELOG.md
npm ci
npm run check:all
npm pack --dry-run
npm pack

# Test the archive in the local application before continuing

# Back in the library repository
git status
git diff
git add .
git commit -m "Release v<version>"
git push origin main
git tag v<version>
git push origin v<version>

# After GitHub Actions succeeds
npm view intent-link version
```
