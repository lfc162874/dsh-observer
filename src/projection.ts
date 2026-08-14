/** Pure `observerDiagnostics` Session projection and deterministic rules. */

import { z } from 'zod'
import type {} from '@deepseek-ai/dsh-llm-retry/types'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { toolCallFingerprint, toolErrorFingerprint } from './fingerprint.ts'
import type {
  DiagnosticEventPoint,
  DiagnosticIssue,
  DiagnosticIssueId,
  ObserverDiagnosticsProjection,
  ObserverSummary,
} from './types.ts'

/** Validated rule tunables resolved by the Host plugin. */
export interface ObserverRuleConfig {
  repeatCallThreshold: number
  repeatedErrorThreshold: number
  maxIssues: number
}

interface PatternRun {
  fingerprint: string
  toolName: string
  occurrences: number
  first: DiagnosticEventPoint & { time: number }
  latest: DiagnosticEventPoint & { time: number }
  issueId: DiagnosticIssueId | null
}

interface PendingCall {
  toolName: string
}

interface ObserverState {
  summary: ObserverSummary
  firstEventTime: number | null
  pendingCalls: Record<string, PendingCall>
  callRun: PatternRun | null
  errorRun: PatternRun | null
  issues: DiagnosticIssue[]
}

const issueIdSchema = z.string().transform(value => value as DiagnosticIssueId)
const eventPointSchema = z.object({
  seq: z.number().int().nonnegative(),
  turn: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
}).strict()
const issueSchema = z.object({
  id: issueIdSchema,
  ruleId: z.enum(['repeat-tool-call', 'repeated-tool-error']),
  severity: z.literal('warning'),
  certainty: z.literal('high'),
  toolName: z.string(),
  evidence: z.object({ from: eventPointSchema, to: eventPointSchema }).strict(),
  metrics: z.object({
    occurrences: z.number().int().nonnegative(),
    elapsedMs: z.number().nonnegative(),
  }).strict(),
}).strict()
const projectionSchema: z.ZodType<ObserverDiagnosticsProjection> = z.object({
  summary: z.object({
    turns: z.number().int().nonnegative(),
    steps: z.number().int().nonnegative(),
    modelCalls: z.number().int().nonnegative(),
    toolCalls: z.number().int().nonnegative(),
    failedToolCalls: z.number().int().nonnegative(),
    retries: z.number().int().nonnegative(),
    inputTokens: z.number().nonnegative(),
    cacheReadTokens: z.number().nonnegative(),
    cacheWriteTokens: z.number().nonnegative(),
    outputTokens: z.number().nonnegative(),
    elapsedMs: z.number().nonnegative(),
  }).strict(),
  issues: z.array(issueSchema),
}).strict()

function emptySummary(): ObserverSummary {
  return {
    turns: 0,
    steps: 0,
    modelCalls: 0,
    toolCalls: 0,
    failedToolCalls: 0,
    retries: 0,
    inputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    elapsedMs: 0,
  }
}

function initState(): ObserverState {
  return {
    summary: emptySummary(),
    firstEventTime: null,
    pendingCalls: {},
    callRun: null,
    errorRun: null,
    issues: [],
  }
}

function touch(state: ObserverState, time: number): ObserverState {
  const firstEventTime = state.firstEventTime ?? time
  return {
    ...state,
    firstEventTime,
    summary: { ...state.summary, elapsedMs: Math.max(0, time - firstEventTime) },
  }
}

function point(event: SessionEvent<'tool/call' | 'tool/result'>): DiagnosticEventPoint & { time: number } {
  return {
    seq: event.seq,
    turn: event.data.turn,
    step: event.data.step,
    time: event.time,
  }
}

function issueId(rule: 'repeat-tool-call' | 'repeated-tool-error', firstSeq: number): DiagnosticIssueId {
  return `${rule}:${String(firstSeq)}` as DiagnosticIssueId
}

function issueFromRun(
  ruleId: 'repeat-tool-call' | 'repeated-tool-error',
  run: PatternRun,
  id: DiagnosticIssueId,
): DiagnosticIssue {
  return {
    id,
    ruleId,
    severity: 'warning',
    certainty: 'high',
    toolName: run.toolName,
    evidence: {
      from: { seq: run.first.seq, turn: run.first.turn, step: run.first.step },
      to: { seq: run.latest.seq, turn: run.latest.turn, step: run.latest.step },
    },
    metrics: {
      occurrences: run.occurrences,
      elapsedMs: Math.max(0, run.latest.time - run.first.time),
    },
  }
}

function upsertIssue(
  issues: readonly DiagnosticIssue[],
  issue: DiagnosticIssue,
  maxIssues: number,
): DiagnosticIssue[] {
  const index = issues.findIndex(candidate => candidate.id === issue.id)
  if (index >= 0) return issues.map(candidate => candidate.id === issue.id ? issue : candidate)
  const appended = [...issues, issue]
  return appended.length <= maxIssues ? appended : appended.slice(appended.length - maxIssues)
}

function advanceRun(
  previous: PatternRun | null,
  fingerprint: string,
  toolName: string,
  latest: PatternRun['latest'],
): PatternRun {
  if (previous === null || previous.fingerprint !== fingerprint || previous.toolName !== toolName) {
    return {
      fingerprint,
      toolName,
      occurrences: 1,
      first: latest,
      latest,
      issueId: null,
    }
  }
  return { ...previous, occurrences: previous.occurrences + 1, latest }
}

function diagnoseRun(
  issues: readonly DiagnosticIssue[],
  run: PatternRun,
  ruleId: 'repeat-tool-call' | 'repeated-tool-error',
  threshold: number,
  maxIssues: number,
): { issues: DiagnosticIssue[]; run: PatternRun } {
  if (run.occurrences < threshold) return { issues: [...issues], run }
  const id = run.issueId ?? issueId(ruleId, run.first.seq)
  const diagnosed = run.issueId === null ? { ...run, issueId: id } : run
  return {
    issues: upsertIssue(issues, issueFromRun(ruleId, diagnosed, id), maxIssues),
    run: diagnosed,
  }
}

function withoutPending(
  pendingCalls: Readonly<Record<string, PendingCall>>,
  callId: string,
): Record<string, PendingCall> {
  return Object.fromEntries(Object.entries(pendingCalls).filter(([id]) => id !== callId))
}

function usageValue(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value < 0 ? 0 : value
}

/**
 * Create the configured projection definition.
 * @param config - Validated deterministic-rule thresholds and result bound.
 * @returns Projection unit registered by the Host plugin.
 */
export function createObserverDiagnosticsProjection(
  config: ObserverRuleConfig,
): ProjectionDefinition<'observerDiagnostics', ObserverState> {
  return {
    key: 'observerDiagnostics',
    schema: projectionSchema,
    init: initState,
    apply: (state, event) => {
      switch (event.type) {
        case 'turn/start': {
          const next = touch(state, event.time)
          return { ...next, callRun: null, errorRun: null }
        }
        case 'turn/end': {
          const next = touch(state, event.time)
          return {
            ...next,
            summary: { ...next.summary, turns: next.summary.turns + 1 },
            pendingCalls: {},
          }
        }
        case 'step/end': {
          const next = touch(state, event.time)
          return { ...next, summary: { ...next.summary, steps: next.summary.steps + 1 } }
        }
        case 'assistant/message': {
          const next = touch(state, event.time)
          const usage = event.data.usage
          return {
            ...next,
            summary: {
              ...next.summary,
              modelCalls: next.summary.modelCalls + 1,
              inputTokens: next.summary.inputTokens + usageValue(usage?.inputTokens),
              cacheReadTokens: next.summary.cacheReadTokens + usageValue(usage?.cacheReadTokens),
              cacheWriteTokens: next.summary.cacheWriteTokens + usageValue(usage?.cacheWriteTokens),
              outputTokens: next.summary.outputTokens + usageValue(usage?.outputTokens),
            },
          }
        }
        case 'llm/retry': {
          const next = touch(state, event.time)
          return { ...next, summary: { ...next.summary, retries: next.summary.retries + 1 } }
        }
        case 'tool/call': {
          const next = touch(state, event.time)
          const fingerprint = toolCallFingerprint(event.data.name, event.data.arguments)
          const advanced = advanceRun(next.callRun, fingerprint, event.data.name, point(event))
          const diagnosed = diagnoseRun(
            next.issues,
            advanced,
            'repeat-tool-call',
            config.repeatCallThreshold,
            config.maxIssues,
          )
          return {
            ...next,
            summary: { ...next.summary, toolCalls: next.summary.toolCalls + 1 },
            pendingCalls: {
              ...next.pendingCalls,
              [event.data.callId]: { toolName: event.data.name },
            },
            callRun: diagnosed.run,
            issues: diagnosed.issues,
          }
        }
        case 'tool/result': {
          const next = touch(state, event.time)
          const callId = event.data.message.source.callId
          const pending = Object.hasOwn(next.pendingCalls, callId)
            ? next.pendingCalls[callId]
            : undefined
          const toolName = pending?.toolName ?? 'unknown'
          const fingerprint = toolErrorFingerprint(toolName, event.data.message.content[0], event.data.error)
          if (fingerprint === null) {
            return { ...next, pendingCalls: withoutPending(next.pendingCalls, callId) }
          }
          const advanced = advanceRun(next.errorRun, fingerprint, toolName, point(event))
          const diagnosed = diagnoseRun(
            next.issues,
            advanced,
            'repeated-tool-error',
            config.repeatedErrorThreshold,
            config.maxIssues,
          )
          return {
            ...next,
            summary: {
              ...next.summary,
              failedToolCalls: next.summary.failedToolCalls + 1,
            },
            pendingCalls: withoutPending(next.pendingCalls, callId),
            errorRun: diagnosed.run,
            issues: diagnosed.issues,
          }
        }
        default:
          return state
      }
    },
    view: state => ({ summary: state.summary, issues: state.issues }),
    stateVersion: 2,
  }
}
