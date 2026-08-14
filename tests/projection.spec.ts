import { describe, expect, it } from 'vitest'
import { CallId, createMessage, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-llm-retry/types'
import type { SessionEvent, SessionEventType } from '@deepseek-ai/dsh-session'
import { createObserverDiagnosticsProjection } from '../src/projection.ts'
import type { ObserverDiagnosticsProjection } from '../src/types.ts'

const RULES = {
  repeatCallThreshold: 3,
  repeatedErrorThreshold: 2,
  maxIssues: 10,
}

function at<T extends SessionEventType>(
  seq: number,
  time: number,
  type: T,
  data: SessionEvent<T>['data'],
): SessionEvent<T> {
  return { seq, time, type, data } as SessionEvent<T>
}

function call(seq: number, time: number, callId: string, name: string, args: string): SessionEvent<'tool/call'> {
  return at(seq, time, 'tool/call', {
    turn: 1,
    step: seq + 1,
    callId: CallId(callId),
    name,
    arguments: args,
  })
}

function result(
  seq: number,
  time: number,
  callId: string,
  text: string,
  isError: boolean,
): SessionEvent<'tool/result'> {
  return at(seq, time, 'tool/result', {
    turn: 1,
    step: seq + 1,
    message: createToolResultMessage({
      callId: CallId(callId),
      content: [{ type: 'text', text }],
      isError,
    }),
  })
}

function fold(events: readonly SessionEvent[]): ObserverDiagnosticsProjection {
  const definition = createObserverDiagnosticsProjection(RULES)
  let state = definition.init()
  for (const event of events) state = definition.apply(state, event)
  return definition.view(state)
}

describe('observerDiagnostics projection', () => {
  it('starts with an empty bounded value', () => {
    expect(fold([])).toEqual({
      summary: {
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
      },
      issues: [],
    })
  })

  it('detects canonical identical consecutive Tool calls and updates one stable finding', () => {
    const projection = fold([
      at(0, 1_000, 'turn/start', { turn: 1 }),
      call(1, 1_100, 'c1', 'read', '{"path":"a","options":{"line":1,"column":2}}'),
      call(2, 1_300, 'c2', 'read', '{"options":{"column":2,"line":1},"path":"a"}'),
      call(3, 1_600, 'c3', 'read', '{"path":"a","options":{"line":1,"column":2}}'),
      call(4, 1_900, 'c4', 'read', '{"options":{"line":1,"column":2},"path":"a"}'),
    ])

    expect(projection.summary.toolCalls).toBe(4)
    expect(projection.issues).toEqual([expect.objectContaining({
      id: 'repeat-tool-call:1',
      ruleId: 'repeat-tool-call',
      toolName: 'read',
      evidence: {
        from: { seq: 1, turn: 1, step: 2 },
        to: { seq: 4, turn: 1, step: 5 },
      },
      metrics: { occurrences: 4, elapsedMs: 800 },
    })])
  })

  it('ignores shell descriptions that do not affect execution identity', () => {
    const projection = fold([
      at(0, 0, 'turn/start', { turn: 1 }),
      call(1, 10, 'c1', 'bash', '{"command":"pnpm build","description":"first attempt"}'),
      call(2, 20, 'c2', 'bash', '{"description":"second attempt","command":"pnpm build"}'),
      call(3, 30, 'c3', 'bash', '{"command":"pnpm build","description":"check again"}'),
    ])

    expect(projection.issues).toEqual([expect.objectContaining({
      ruleId: 'repeat-tool-call',
      toolName: 'bash',
      metrics: { occurrences: 3, elapsedMs: 20 },
    })])
  })

  it('resets exact-call detection after a different tracked call and at a new Turn', () => {
    const projection = fold([
      at(0, 0, 'turn/start', { turn: 1 }),
      call(1, 10, 'c1', 'read', '{"path":"a"}'),
      call(2, 20, 'c2', 'grep', '{"query":"a"}'),
      call(3, 30, 'c3', 'read', '{"path":"a"}'),
      call(4, 40, 'c4', 'read', '{"path":"a"}'),
      at(5, 50, 'turn/start', { turn: 2 }),
      at(6, 60, 'tool/call', {
        turn: 2,
        step: 1,
        callId: CallId('c5'),
        name: 'read',
        arguments: '{"path":"a"}',
      }),
    ])

    expect(projection.issues).toEqual([])
  })

  it('detects repeated exact Tool-error evidence across successful intervening work', () => {
    const projection = fold([
      at(0, 0, 'turn/start', { turn: 1 }),
      call(1, 100, 'build-1', 'bash', '{"cmd":"pnpm build"}'),
      result(2, 200, 'build-1', '\u001b[31mTS2339: Property foo is missing\u001b[0m', true),
      call(3, 300, 'edit-1', 'edit', '{"path":"src/a.ts"}'),
      result(4, 350, 'edit-1', 'updated', false),
      call(5, 500, 'build-2', 'bash', '{"cmd":"pnpm build"}'),
      result(6, 650, 'build-2', 'TS2339:   Property foo is missing', true),
    ])

    expect(projection.summary.failedToolCalls).toBe(2)
    expect(projection.issues).toEqual([expect.objectContaining({
      id: 'repeated-tool-error:2',
      ruleId: 'repeated-tool-error',
      toolName: 'bash',
      evidence: {
        from: { seq: 2, turn: 1, step: 3 },
        to: { seq: 6, turn: 1, step: 7 },
      },
      metrics: { occurrences: 2, elapsedMs: 450 },
    })])
  })

  it('classifies repeated non-zero shell exits from the stable result marker', () => {
    const projection = fold([
      at(0, 0, 'turn/start', { turn: 1 }),
      call(1, 100, 'bash-1', 'bash', '{"command":"exit 7","description":"first"}'),
      result(2, 150, 'bash-1', '[stderr]\nobserver-smoke-error\n[exit code: 7]', false),
      call(3, 200, 'bash-2', 'bash', '{"command":"exit 7","description":"second"}'),
      result(4, 250, 'bash-2', '[stderr]\nobserver-smoke-error\n[exit code: 7]', false),
    ])

    expect(projection.summary.failedToolCalls).toBe(2)
    expect(projection.issues).toEqual([expect.objectContaining({
      id: 'repeated-tool-error:2',
      ruleId: 'repeated-tool-error',
      toolName: 'bash',
      metrics: { occurrences: 2, elapsedMs: 100 },
    })])
  })

  it('does not treat marker-like successful shell output as a failure', () => {
    const projection = fold([
      at(0, 0, 'turn/start', { turn: 1 }),
      call(1, 10, 'bash-1', 'bash', '{"command":"printf marker","description":"print"}'),
      result(2, 20, 'bash-1', '[exit code: 7]', false),
    ])

    expect(projection.summary.failedToolCalls).toBe(0)
    expect(projection.issues).toEqual([])
  })

  it('counts durable lifecycle, retry, and token facts without counting malformed negative usage', () => {
    const projection = fold([
      at(0, 1_000, 'turn/start', { turn: 1 }),
      at(1, 1_050, 'assistant/message', {
        turn: 1,
        step: 1,
        message: createMessage({
          role: 'assistant',
          content: [{ type: 'text', text: 'done' }],
          source: { kind: 'model', provider: 'mock', model: 'mock' },
        }),
        usage: {
          inputTokens: 10,
          outputTokens: 4,
          cacheReadTokens: 20,
          cacheWriteTokens: -1,
        },
      }),
      at(2, 1_100, 'llm/retry', {
        retryId: 'retry-1' as never,
        turn: 1,
        step: 1,
        provider: 'mock',
        mode: 'normal',
        policyKey: 'default',
        retry: 1,
        maxRetries: 2,
        delayMs: 100,
        failure: { message: 'busy', code: 'RATE_LIMIT' },
      }),
      at(3, 1_200, 'step/end', { turn: 1, step: 1 }),
      at(4, 1_500, 'turn/end', { turn: 1, reason: { kind: 'completed' } }),
    ])

    expect(projection.summary).toEqual(expect.objectContaining({
      turns: 1,
      steps: 1,
      modelCalls: 1,
      retries: 1,
      inputTokens: 10,
      cacheReadTokens: 20,
      cacheWriteTokens: 0,
      outputTokens: 4,
      elapsedMs: 500,
    }))
  })
})
