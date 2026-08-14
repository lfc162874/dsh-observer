/** Pure presentation for the Observer conversation view. */

import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DiagnosticIssue } from '../types.ts'
import css from './DiagnosticsView.module.css'

type DiagnosticsViewProps = ConvViewProps & PropsLocale<'observer'>

function formatNumber(value: number): string {
  return value.toLocaleString()
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${String(Math.round(milliseconds))}ms`
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)}s`
  const minutes = Math.floor(milliseconds / 60_000)
  const seconds = Math.round((milliseconds % 60_000) / 1_000)
  return `${String(minutes)}m ${String(seconds)}s`
}

function IssueCard({ issue, t }: { issue: DiagnosticIssue; t: DiagnosticsViewProps['t'] }) {
  const repeatCall = issue.ruleId === 'repeat-tool-call'
  return (
    <article className={css.issue} aria-labelledby={`diagnostic-${issue.id}`}>
      <div className={css.issueHeader}>
        <span className={css.severity}>{t('issue.warning')}</span>
        <span className={css.rule}>{issue.ruleId}</span>
      </div>
      <h3 id={`diagnostic-${issue.id}`} className={css.issueTitle}>
        {t(repeatCall ? 'issue.repeatCall.title' : 'issue.repeatedError.title')}
      </h3>
      <p className={css.issueBody}>{t(
        repeatCall ? 'issue.repeatCall.body' : 'issue.repeatedError.body',
        { tool: issue.toolName, count: issue.metrics.occurrences },
      )}</p>
      <div className={css.evidence}>
        <span>{t('issue.evidence', {
            from: issue.evidence.from.seq,
            to: issue.evidence.to.seq,
            turn: issue.evidence.from.turn,
            step: issue.evidence.from.step,
          })}</span>
        <span>{t('issue.elapsed', { duration: formatDuration(issue.metrics.elapsedMs) })}</span>
      </div>
      <p className={css.recommendation}>
        {t(repeatCall ? 'issue.repeatCall.recommendation' : 'issue.repeatedError.recommendation')}
      </p>
    </article>
  )
}

/**
 * Render the whole-session diagnostics projection.
 * @param props - Conversation view runtime and Observer locale shares.
 * @returns Diagnostics tab contents.
 */
export function DiagnosticsView({ useProjection, t }: DiagnosticsViewProps) {
  const projection = useProjection('observerDiagnostics')
  if (projection === undefined) {
    return (
      <main className={css.root}>
        <section className={css.state} role="status">
          <h1>{t('unavailable.title')}</h1>
          <p>{t('unavailable.body')}</p>
        </section>
      </main>
    )
  }

  const metrics = [
    [t('metric.turns'), projection.summary.turns],
    [t('metric.steps'), projection.summary.steps],
    [t('metric.toolCalls'), projection.summary.toolCalls],
    [t('metric.failedTools'), projection.summary.failedToolCalls],
  ] as const

  return (
    <main className={css.root}>
      <header className={css.header}>
        <div>
          <p className={css.eyebrow}>{t('header.eyebrow')}</p>
          <h1>{t('header.title')}</h1>
        </div>
        <span className={css.findingCount} role="status">
          {t('header.findings', { count: projection.issues.length })}
        </span>
      </header>

      <section className={css.metrics} aria-label={t('header.title')}>
        {metrics.map(([label, value]) => (
          <div className={css.metric} key={label}>
            <span>{label}</span>
            <strong>{formatNumber(value)}</strong>
          </div>
        ))}
      </section>

      <section className={css.findings} aria-labelledby="observer-findings-title">
        <h2 id="observer-findings-title">{t('section.findings')}</h2>
        {projection.issues.length === 0
          ? (
              <div className={css.state} role="status">
                <h3>{t('empty.title')}</h3>
                <p>{t('empty.body')}</p>
              </div>
            )
          : (
              <div className={css.issueList}>
                {projection.issues.map(issue => <IssueCard issue={issue} key={issue.id} t={t} />)}
              </div>
            )}
      </section>
    </main>
  )
}
