// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ObserverDiagnosticsProjection } from '../src/types.ts'
import { DiagnosticsView } from '../src/client/DiagnosticsView.tsx'
import { en, type ObserverKey } from '../src/client/locales.ts'

function translate(key: ObserverKey, params: Record<string, unknown> = {}): string {
  let value = en[key]
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement))
  }
  return value
}

function props(projection: ObserverDiagnosticsProjection | undefined) {
  return {
    useProjection: () => projection,
    t: translate,
  } as unknown as Parameters<typeof DiagnosticsView>[0]
}

const EMPTY: ObserverDiagnosticsProjection = {
  summary: {
    turns: 2,
    steps: 5,
    modelCalls: 5,
    toolCalls: 8,
    failedToolCalls: 0,
    retries: 0,
    inputTokens: 100,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 20,
    elapsedMs: 1_000,
  },
  issues: [],
}

describe('DiagnosticsView', () => {
  it('explains when the Host projection is unavailable', () => {
    render(<DiagnosticsView {...props(undefined)} />)
    expect(screen.getByRole('heading', { name: 'Diagnostics are unavailable' })).toBeTruthy()
  })

  it('renders whole-session metrics and the no-finding state', () => {
    render(<DiagnosticsView {...props(EMPTY)} />)
    expect(screen.getByRole('heading', { name: 'Execution diagnostics' })).toBeTruthy()
    expect(screen.getByText('8')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'No clear anomalies detected' })).toBeTruthy()
  })

  it('renders evidence and recommendation for a finding', () => {
    render(<DiagnosticsView {...props({
      ...EMPTY,
      summary: { ...EMPTY.summary, failedToolCalls: 2 },
      issues: [{
        id: 'repeated-tool-error:12' as never,
        ruleId: 'repeated-tool-error',
        severity: 'warning',
        certainty: 'high',
        toolName: 'bash',
        evidence: {
          from: { seq: 12, turn: 2, step: 3 },
          to: { seq: 24, turn: 2, step: 6 },
        },
        metrics: { occurrences: 2, elapsedMs: 1_500 },
      }],
    })} />)

    expect(screen.getByRole('heading', { name: 'Repeated error evidence' })).toBeTruthy()
    expect(screen.getByText('The same failure evidence appeared 2 times for bash.')).toBeTruthy()
    expect(screen.getByText('Evidence seq 12–24 · Turn 2 / Step 3')).toBeTruthy()
    expect(screen.getByText('Associated time 1.5s')).toBeTruthy()
  })
})
