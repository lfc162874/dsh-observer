/** Diagnostics view dictionaries. */

/** Dictionary namespace owned by Observer. */
export const NS = 'observer'

/** Complete dictionary key set. */
export type ObserverKey =
  | 'view.diagnostics'
  | 'header.eyebrow'
  | 'header.title'
  | 'header.findings'
  | 'metric.turns'
  | 'metric.steps'
  | 'metric.toolCalls'
  | 'metric.failedTools'
  | 'section.findings'
  | 'empty.title'
  | 'empty.body'
  | 'unavailable.title'
  | 'unavailable.body'
  | 'issue.warning'
  | 'issue.repeatCall.title'
  | 'issue.repeatCall.body'
  | 'issue.repeatCall.recommendation'
  | 'issue.repeatedError.title'
  | 'issue.repeatedError.body'
  | 'issue.repeatedError.recommendation'
  | 'issue.evidence'
  | 'issue.elapsed'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Observer Diagnostics tab and finding copy. */
    observer: ObserverKey
  }
}

/** Simplified Chinese dictionary. */
export const zh: Record<ObserverKey, string> = {
  'view.diagnostics': '诊断',
  'header.eyebrow': 'Agent 诊断层',
  'header.title': '执行诊断',
  'header.findings': '{count} 个发现',
  'metric.turns': 'Turns',
  'metric.steps': 'Steps',
  'metric.toolCalls': '工具调用',
  'metric.failedTools': '失败调用',
  'section.findings': '关键发现',
  'empty.title': '暂未发现明显异常',
  'empty.body': 'Observer 已分析当前完整 Session 日志；后续事件会继续增量更新。',
  'unavailable.title': '诊断能力未加载',
  'unavailable.body': '当前 Host 没有提供 observerDiagnostics projection。',
  'issue.warning': '警告',
  'issue.repeatCall.title': '重复工具调用',
  'issue.repeatCall.body': '{tool} 使用相同参数连续执行了 {count} 次。',
  'issue.repeatCall.recommendation': '重新检查最近一次结果；如果状态没有变化，请调整参数、切换策略或结束当前路径。',
  'issue.repeatedError.title': '错误重复出现',
  'issue.repeatedError.body': '{tool} 的同一错误证据出现了 {count} 次。',
  'issue.repeatedError.recommendation': '回到首次错误对应的前置条件，确认后续修改是否真正改变了失败原因。',
  'issue.evidence': '证据 seq {from}–{to} · Turn {turn} / Step {step}',
  'issue.elapsed': '关联时间 {duration}',
}

/** English dictionary. */
export const en: Record<ObserverKey, string> = {
  'view.diagnostics': 'Diagnostics',
  'header.eyebrow': 'Agent diagnostic layer',
  'header.title': 'Execution diagnostics',
  'header.findings': '{count} findings',
  'metric.turns': 'Turns',
  'metric.steps': 'Steps',
  'metric.toolCalls': 'Tool calls',
  'metric.failedTools': 'Failed calls',
  'section.findings': 'Key findings',
  'empty.title': 'No clear anomalies detected',
  'empty.body': 'Observer has analyzed the complete Session log and will update as new events arrive.',
  'unavailable.title': 'Diagnostics are unavailable',
  'unavailable.body': 'The current Host does not provide the observerDiagnostics projection.',
  'issue.warning': 'Warning',
  'issue.repeatCall.title': 'Repeated Tool call',
  'issue.repeatCall.body': '{tool} ran {count} consecutive times with identical arguments.',
  'issue.repeatCall.recommendation': 'Re-read the latest result. If state did not change, alter the arguments, switch strategy, or stop this path.',
  'issue.repeatedError.title': 'Repeated error evidence',
  'issue.repeatedError.body': 'The same failure evidence appeared {count} times for {tool}.',
  'issue.repeatedError.recommendation': 'Return to the first failure precondition and verify that later changes actually alter the failure cause.',
  'issue.evidence': 'Evidence seq {from}–{to} · Turn {turn} / Step {step}',
  'issue.elapsed': 'Associated time {duration}',
}
