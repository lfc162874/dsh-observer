# Initial Observer architecture

English | [中文](2026-08-14-initial-observer-architecture.zh.md)

Status: implemented

## Problem

DeepSeek Harness already records and renders an execution trajectory. A diagnostic plugin needs to identify execution anti-patterns without duplicating the trajectory, replacing telemetry delivery, modifying the agent loop, or producing findings that change after a session reload.

## Decision

`dsh-observer` is one installable bundle and npm package. Its Host face registers the `observerDiagnostics` session projection; its browser face contributes the `diagnostics` conversation view. Separate TypeScript programs compile the faces because Host and Client packages merge different services into the Cordis `Context` interface.

The durable `SessionEvent` log is the only diagnostic input. The projection stores bounded fingerprints, pending Tool correlation, aggregate counters, and bounded findings as plain JSON. It returns the same state reference for events unrelated to its rules. Every finding identifies the first and latest supporting event sequences and uses discrete certainty rather than an uncalibrated numeric confidence.

The initial rules detect exact consecutive Tool calls and repeated exact Tool-error evidence. They report observed occurrences and elapsed time. They do not classify all associated work as waste and do not promote the earliest observed failure to a semantic root cause.

The browser reads the complete projection through the standard `useProjection` seat. It owns presentation only and keeps no duplicate diagnostic store. A future evidence handoff to Trajectory requires a public sequence-anchor protocol from that view.

## Consequences

Diagnostics survive refresh, resume, pagination, and projection-cache rebuilds. Observer coexists with any `SessionTelemetryBackend`. Rule evaluation remains synchronous on the session-event path, so expensive semantic similarity and model-assisted analysis stay outside the initial projection. The bounded issue list keeps every projection carrier at UI-scale size; a later detailed-evidence API can serve larger material on demand.
