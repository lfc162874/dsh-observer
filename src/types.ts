/**
 * Host/Client wire contract for Observer diagnostics.
 *
 * Keep this module runtime-free: both TypeScript faces compile it and the
 * session-projection declaration merge must remain byte-identical.
 * @module dsh-observer/types
 */

declare const diagnosticIssueIdBrand: unique symbol

/** Stable identity derived from one rule and its first evidence event. */
export type DiagnosticIssueId = string & {
  readonly [diagnosticIssueIdBrand]: 'DiagnosticIssueId'
}

/** Initial deterministic rule vocabulary. */
export type DiagnosticRuleId = 'repeat-tool-call' | 'repeated-tool-error'

/** User-facing importance without claiming task failure. */
export type DiagnosticSeverity = 'warning'

/** Discrete evidence strength; numeric confidence requires later calibration. */
export type DiagnosticCertainty = 'high'

/** One durable position in a Session event log. */
export interface DiagnosticEventPoint {
  /** Session event sequence number. */
  seq: number
  /** Owning Turn number. */
  turn: number
  /** Owning Step number. */
  step: number
}

/** Inclusive event range supporting one finding. */
export interface DiagnosticEvidence {
  /** First event establishing the detected pattern. */
  from: DiagnosticEventPoint
  /** Latest event included in the current pattern. */
  to: DiagnosticEventPoint
}

/** Observed cost of a finding, without counterfactual waste claims. */
export interface DiagnosticIssueMetrics {
  /** Number of matching calls or failures. */
  occurrences: number
  /** Wall time from the first to the latest supporting event. */
  elapsedMs: number
}

/** One evidence-backed finding emitted by the projection. */
export interface DiagnosticIssue {
  id: DiagnosticIssueId
  ruleId: DiagnosticRuleId
  severity: DiagnosticSeverity
  certainty: DiagnosticCertainty
  /** Tool name associated with the pattern. */
  toolName: string
  evidence: DiagnosticEvidence
  metrics: DiagnosticIssueMetrics
}

/** Whole-session facts that can be counted directly from durable events. */
export interface ObserverSummary {
  turns: number
  steps: number
  modelCalls: number
  toolCalls: number
  failedToolCalls: number
  retries: number
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  elapsedMs: number
}

/** Complete bounded value served to the browser for one Session. */
export interface ObserverDiagnosticsProjection {
  summary: ObserverSummary
  issues: DiagnosticIssue[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Replayable execution diagnostics derived from the complete Session log. */
    observerDiagnostics: ObserverDiagnosticsProjection
  }
}
