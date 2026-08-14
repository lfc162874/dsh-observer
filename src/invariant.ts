/** Package-owned invariant companion for `dsh-observer`. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-observer'

/** Cordis companion plugin name. */
export const name = 'dsh-observer-invariant'
/** Invariant registry required for package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package owns no independent mutable relationship.
 * Projection output is a pure function of the authoritative Session event
 * stream and its complete wire value is schema-validated at publication.
 */
const install: InvariantInstaller = () => {}

/**
 * Reserve the package's invariant ownership entry.
 * @param ctx - Host context carrying the invariant registry.
 * @returns Registration disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
