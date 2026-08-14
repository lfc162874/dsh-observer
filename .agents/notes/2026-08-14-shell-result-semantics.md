# Shell result semantics

Status: implemented

## Problem

Harness Bash and Pwsh tools deliberately keep non-zero process exits as `isError: false`; their durable result text carries a stable trailing `[exit code: N]` or `[killed by signal: X]` marker. Their required `description` argument is presentation-only. Treating only `isError` as failure missed repeated command failures, while hashing `description` split otherwise identical executions.

## Decision

Observer uses the public `@deepseek-ai/dsh-shell` `parseExitStatus()` contract for Bash/Pwsh results. Non-zero and signalled foreground results count as failed Tool calls and participate in repeated-error matching. Shell call fingerprints omit `description` but retain every execution-affecting field. Other tools keep complete canonical arguments and structured `isError` semantics.

The projection state version advances to `2` so cached sessions replay with these semantics.

## Consequences

The Diagnostics view agrees with Harness terminal cards for Shell exit status and detects repeated build/test failures even when descriptions vary. Marker-like successful output without the renderer's leading newline remains ordinary output. Tool-specific normalization stays explicit rather than applying heuristic key removal to all tools.
