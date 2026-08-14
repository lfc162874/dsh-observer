# dsh-observer

English | [中文](README.zh.md)

Evidence-based execution diagnostics for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). The plugin derives replayable findings from the durable Session log and adds a **Diagnostics** view beside Chat and Trajectory.

The initial rules intentionally make narrow claims:

- repeated consecutive Tool calls with identical canonical execution arguments; Bash/Pwsh `description` text is excluded because Harness documents it as presentation-only;
- repeated Tool failures with the same normalized error evidence, including structured Tool errors and the stable non-zero/signal markers emitted by Harness Bash/Pwsh tools;
- whole-session counts for Turns, Steps, model calls, Tool calls, failures, retries, and provider-reported tokens.

Every finding carries its source event range. Time and token values describe observed work; the plugin does not label them as proven waste or claim a semantic root cause.

## Architecture

```text
SessionEvent log
      ↓
observerDiagnostics projection
      ↓
bounded DiagnosticIssue[]
      ↓
Diagnostics conversation view
```

The package is one installable Harness bundle with two compile-time faces:

- the Host plugin registers a synchronous, JSON-serializable projection unit on `ctx.sessionProjections`;
- the browser plugin registers one `conversation.view` entry and reads the projection through the framework-provided `useProjection` hook.

`SessionTelemetryBackend` is not involved. Observer remains compatible with the deployment's existing OTel or other telemetry backend.

## Development

Requirements match Harness: Node `^22.19.0 || >=24` and pnpm.

```sh
pnpm install
pnpm run check
pnpm run build
```

The repository develops against the public Harness `0.1.0-rc.6` packages. Runtime peer ranges begin at `0.1.0-rc.5`, matching the adjacent Harness checkout used to establish this scaffold, and accept newer pre-1.0 builds.

To try the local checkout from a sibling DeepSeek Harness checkout:

```sh
pnpm dsh plugin --profile web add ../dsh-observer
pnpm dsh --profile web --dump-config
pnpm dsh --profile web
```

The first command changes the selected local profile. Use a disposable profile if you do not want to alter an existing setup.

## Install from GitHub

Git dependencies receive source files, so this package declares a `prepare` build. pnpm 10+ requires the user to allow that build explicitly. Pin a reviewed commit, follow the build-allowance instruction printed by pnpm, then retry:

```sh
dsh plugin --profile web add github:lfc162874/dsh-observer#<commit>
```

For registry publication, remove `private: true`, choose the intended license, run `pnpm run check`, and inspect `pnpm run pack:check` before publishing.

## Configuration

The bundle inserts these defaults; a later profile patch can replace the row's complete `config` value:

```yaml
- id: observer
  name: dsh-observer
  config:
    repeatCallThreshold: 3
    repeatedErrorThreshold: 2
    maxIssues: 50
```

All thresholds must be integers. Detection thresholds must be at least `2`; `maxIssues` must be at least `1`. Invalid values fail during plugin load.

## Model Experience

None. The plugin reads committed events and publishes a client projection. It does not add prompts, messages, tools, schemas, or injected context.

#### KV Cache effect

None. Observer does not assemble or send provider requests.

## Known Limitations and Deferred Work

- The first loop rule covers exact consecutive calls. Cyclic `A → B → A → B` and result-similarity analysis are deferred until labelled fixtures define acceptable false-positive rates.
- Repeated-error matching removes ANSI control sequences and normalizes whitespace but otherwise remains exact. Shell exit status uses the public `@deepseek-ai/dsh-shell` parser; the rule deliberately does not erase paths, line numbers, or domain-specific identifiers.
- Diagnostics-to-Trajectory navigation is deferred because the current Trajectory view has no public event-sequence anchor protocol.
- Projection payloads are capped by `maxIssues`; older findings fall out of the view while aggregate counts remain whole-session values.
