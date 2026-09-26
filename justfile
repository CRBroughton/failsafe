# Publish commands for the three packages in this monorepo.
#
# @crbroughton/failsafe already has npm Trusted Publisher configured, so
# it normally ships via CI (release.yml -> `changeset publish`) when a
# GitHub Release is cut — `publish-core` here is a manual escape hatch,
# not the normal path.
#
# eslint-plugin-failsafe and failsafe-vitest have never been published.
# Trusted Publisher can't be configured for a package that doesn't exist
# on the registry yet, so their *first* publish has to happen manually,
# from an authenticated `npm login` session. After that first publish,
# add Trusted Publisher for each on npmjs.com and future releases go
# through CI like @crbroughton/failsafe already does — use `publish-all`
# from then on, not these individual recipes.

# List available recipes
default:
    just --list

# First-time manual publish: @crbroughton/eslint-plugin-failsafe
publish-eslint:
    devenv shell -- bash -c "cd packages/eslint-plugin-failsafe && npm publish --access public"

# First-time manual publish: @crbroughton/failsafe-vitest
publish-vitest:
    devenv shell -- bash -c "cd packages/failsafe-vitest && npm publish --access public"

# Manual publish escape hatch: @crbroughton/failsafe (normally ships via CI)
publish-core:
    devenv shell -- bash -c "cd packages/failsafe && npm publish --access public"

# Build everything, then publish every package with a pending version via
# changesets — the normal release flow once Trusted Publishing is set up
# for all three packages (same command CI runs).
publish-all:
    devenv shell -- pnpm exec nx run-many -t build
    devenv shell -- pnpm exec changeset publish
