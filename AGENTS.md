# AGENTS.md

`dsh-observer` is an out-of-tree DeepSeek Harness bundle. It adds evidence-based diagnostics without modifying the agent loop.

## Architecture

- `src/index.ts` is the Host function plugin. It registers one pure `observerDiagnostics` unit on `ctx.sessionProjections`.
- `src/client/index.ts` is the Web Client plugin. It contributes the `diagnostics` entry to the existing `conversation.view` slot.
- `src/types.ts` is the only shared Host/Client domain contract. Keep it free of runtime imports.
- `cordis.patch.yml` is the installable bundle layer. The package declares both `dsh.bundle` and `dsh.client` in `package.json`.
- Host and Client compile in separate TypeScript programs because their Cordis `Context` merges are different.

## Rules

- Derive diagnostics only from durable `SessionEvent` records so refresh, resume, and replay produce the same result.
- Do not use `SessionTelemetryBackend` as the data source; it is an external reporting backend and permits one provider per context.
- Keep projection transitions synchronous, deterministic, JSON-serializable, and bounded. Return the same state reference for irrelevant events.
- Every finding carries event-sequence evidence. Do not present associated time or tokens as proven waste.
- Numeric confidence is forbidden until calibrated against a labelled corpus. Use the discrete `certainty` vocabulary.
- Deployment-varying thresholds and result bounds belong in the exported `Config` schema and fail loudly when invalid.
- UI composition goes only through `ctx.slots.register` inside `ctx.slots.inject`. Components never receive or import `ctx`.
- Browser business state comes through framework hooks; do not create a second subscription or copy projection state into a store.
- Use Harness `--dsw-*` semantic tokens through CSS Modules. Product copy is bilingual; comments and identifiers are English.
- ESM only. Local relative imports include `.ts` / `.tsx`. Public exports and non-obvious module contracts have concise JSDoc.

## Commands

```sh
pnpm install
pnpm run check
pnpm run build
pnpm run pack:check
```

Run focused tests while iterating. Before publishing, verify the packed tarball and install that artifact into a disposable Harness Web profile.
