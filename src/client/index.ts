/** Browser plugin contributing the Diagnostics conversation view. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '../types.ts'
import { DiagnosticsView } from './DiagnosticsView.tsx'
import { en, NS, zh } from './locales.ts'

/** Required browser services: slot registry and locale registry. */
export const inject = ['slots', 'locale']

/**
 * Register dictionaries and the Diagnostics view tab.
 * @param ctx - Browser root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-observer: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'diagnostics',
    order: 20,
    locale: NS,
    label: () => t('view.diagnostics'),
  }, DiagnosticsView))
}
