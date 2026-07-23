// Metro config for a pnpm workspace (Expo SDK 57 / Metro).
//
// pnpm keeps every dependency in a content-addressed store and symlinks the
// resolved copies into each package's node_modules (the "isolated" node-linker,
// pnpm's default). We deliberately keep that default instead of switching to
// `node-linker=hoisted`, because node-linker is a workspace-global pnpm setting
// and flipping it would change the node_modules layout for the sibling
// apps/api package too. Instead we teach Metro about the monorepo:
//
//   1. watchFolders — watch the whole workspace so Metro picks up live changes
//      in @dealpilot/core (source-only workspace package, no build step).
//   2. nodeModulesPaths — resolve from both the app's own node_modules and the
//      workspace root node_modules (hoisted deps live at the root).
//   3. Symlink following is enabled by default in modern Metro, which is what
//      makes pnpm's symlinked store resolvable. We do NOT set
//      disableHierarchicalLookup, because with pnpm's isolated layout Metro
//      must be free to walk up into the .pnpm virtual store for transitive deps.
//
// This is the "documented Metro monorepo config" path; see apps/mobile/README.md.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// @dealpilot/core is a source-only TypeScript ESM package: it imports its own
// modules with explicit `.js` extensions (e.g. `export * from "./types.js"`),
// the TS-ESM convention. Metro does not map a `.js` specifier back to a `.ts`
// source file, so we do it here — scoped to files *inside* packages/core so no
// other resolution is affected.
const CORE_DIR = `${path.sep}packages${path.sep}core${path.sep}`;
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = baseResolveRequest ?? context.resolveRequest;
  const isCoreInternal =
    typeof context.originModulePath === 'string' &&
    context.originModulePath.includes(CORE_DIR) &&
    (moduleName.startsWith('./') || moduleName.startsWith('../')) &&
    moduleName.endsWith('.js');
  if (isCoreInternal) {
    return resolve(context, moduleName.slice(0, -'.js'.length), platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
