/**
 * Host plugin registering replayable Observer diagnostics.
 * @module dsh-observer
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { createObserverDiagnosticsProjection } from './projection.ts'

export type * from './types.ts'

/** Cordis plugin name. */
export const name = 'dsh-observer'
/** Observer contributes one whole-session projection unit. */
export const inject = ['sessionProjections']

/** Deployment-tunable deterministic rule thresholds and result bound. */
export interface Config {
  repeatCallThreshold?: number
  repeatedErrorThreshold?: number
  maxIssues?: number
}

/** Loader-time configuration schema. */
export const Config: z<Config> = z.object({
  repeatCallThreshold: z.number().default(3),
  repeatedErrorThreshold: z.number().default(2),
  maxIssues: z.number().default(50),
})

function positiveInteger(name: string, value: number | undefined, minimum: number): number {
  if (value === undefined || !Number.isInteger(value) || value < minimum) {
    throw new Error(`dsh-observer: ${name} must be an integer >= ${String(minimum)}, got ${String(value)}`)
  }
  return value
}

/**
 * Register the configured diagnostics projection.
 * @param ctx - Host context carrying the session-projection registry.
 * @param config - Schema-validated rule configuration.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.sessionProjections.register(createObserverDiagnosticsProjection({
    repeatCallThreshold: positiveInteger('repeatCallThreshold', config.repeatCallThreshold, 2),
    repeatedErrorThreshold: positiveInteger('repeatedErrorThreshold', config.repeatedErrorThreshold, 2),
    maxIssues: positiveInteger('maxIssues', config.maxIssues, 1),
  }))
}
