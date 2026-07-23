# @dealpilot/mobile

DealPilot mobile app (Expo SDK 57 / React Native 0.86 / React 19, TypeScript
strict, expo-router). First screen: the **Pipeline** (home), built pixel-faithful
to `handoff/design_handoff_dealpilot/screens/01-pipeline.png`.

## Scripts

```bash
pnpm --filter @dealpilot/mobile start       # Expo dev server
pnpm --filter @dealpilot/mobile test        # jest-expo unit + component tests
pnpm --filter @dealpilot/mobile typecheck   # tsc --noEmit (strict)
pnpm --filter @dealpilot/mobile export       # expo export --platform ios (bundle check)
```

## Project structure

```
app/                       expo-router routes
  _layout.tsx              root: font loading + splash gate + providers + Stack
  index.tsx                Pipeline (Home) screen
  deal/[id].tsx            stub deal-detail (full detail is a later phase)
src/
  theme/tokens.ts          all design tokens (colors verbatim from the handoff)
  theme/typography.ts      font-family constants + typography presets
  data/deals.ts            mock deals, seeded from the prototype as core DealStates
  data/store.tsx           DealsProvider / useDeals (React-context mock store)
  lib/pipeline.ts          pure derivation: core calc/score/format → row view models
  components/              DealRow, SearchBar, SectionHeader, Avatar, BottomNav, icons
__tests__/                 pipeline / DealRow / navigation tests
```

## How the pnpm monorepo + Metro is wired

pnpm's default **isolated (symlinked) node-linker** is kept as-is. We deliberately
did **not** switch to `node-linker=hoisted`: `node-linker` is a workspace-global
pnpm setting, so flipping it would also change the `node_modules` layout of the
sibling `apps/api` package (owned by another workstream). Instead Metro is taught
about the monorepo — the "documented Metro monorepo config" path — in
`metro.config.js`:

1. **`watchFolders = [workspaceRoot]`** — so Metro watches the whole workspace and
   picks up live edits in the source-only `@dealpilot/core` package.
2. **`resolver.nodeModulesPaths`** — resolves from both the app's own
   `node_modules` and the workspace-root `node_modules` (where pnpm hoists shared
   deps). Symlink following (on by default in modern Metro) is what makes pnpm's
   symlinked store resolvable.
3. **Scoped `.js` → `.ts` resolver** — `@dealpilot/core` is a source-only
   TypeScript ESM package that imports its own modules with explicit `.js`
   extensions (`export * from "./types.js"`, the TS-ESM convention). Metro does
   not map a `.js` specifier back to its `.ts` source, so `metro.config.js` adds a
   `resolver.resolveRequest` that strips the `.js` extension **only for imports
   originating inside `packages/core`** — nothing else is affected.

This configuration bundles cleanly: `expo export --platform ios` produces a
Hermes bundle with all three font families and router assets.

### Jest equivalent

`jest` runs under the `jest-expo` preset and needs the same two resolutions,
expressed as `moduleNameMapper` in `package.json`:

- `^@dealpilot/core$` → `packages/core/src/index.ts` (core's `package.json`
  `exports` only exposes an `import` condition, which the jest 29 resolver does
  not consult).
- `^(\.{1,2}/.*)\.js$` → strips the `.js` extension from relative imports so
  core's `./types.js`-style specifiers resolve to their `.ts` sources.

`react-native-worklets` (Reanimated 4's worklet transform) is applied via
`babel.config.js` (`react-native-worklets/plugin`, listed last).

## Fonts

Loaded in `app/_layout.tsx` via `expo-font`'s `useFonts`, gated behind the splash
screen (`expo-splash-screen`) until ready:

- **Bricolage Grotesque** 700 — screen/deal titles.
- **Hanken Grotesk** 400/500/600/700 — UI text, labels, buttons.
- **IBM Plex Mono** 400/500/600 — all numbers, mono labels (`SCORE`), KPIs.

## Data: computed, not hard-coded

The mock deals (`src/data/deals.ts`) are seeded from the prototype
(`DealPilot.dc.html`) as full `@dealpilot/core` `DealState` objects. Everything
the pipeline **displays** is computed through core (`src/lib/pipeline.ts`):

- **Score + Ampel colour** ← `computeScore(risks)` / `scoreColor()`
- **Gross yield** ← `calc(state).brutto` → `formatPercent`
- **Price** ← `formatEUR(kaufpreis)`

The risk arrays and rents are chosen so core reproduces the exact screenshot
values (scores 78/61/45/84, yields 4,2/5,1/3,1/4,6 %, open-risk counts 2/3/1/0).
The one display-only override is the MFH's "teilverm." occupancy word — core's
`VermietetStatus` only models `vermietet` / `nicht_vermietet`.

## Deferred / not yet built

- Deal detail (Übersicht / Kalkulation / Dokumente / Chat tabs) — `deal/[id]` is a
  title-only stub.
- Bottom-nav **Markt**, **Profil**, and central **+** are non-functional stubs
  (surface a "bald verfügbar" toast).
- The Pipeline **⋮** action menu (sort Score/Kaufpreis/Datum) is a stub toast.
