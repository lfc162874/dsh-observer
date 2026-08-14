/** Deterministic, bounded fingerprints for Tool calls and error evidence. */

import { createHash } from 'node:crypto'
import type { ContentBlock, ToolResultBlock } from '@deepseek-ai/dsh-llm/types'
import { parseExitStatus } from '@deepseek-ai/dsh-shell'

const ANSI_PATTERN = new RegExp(`${String.fromCodePoint(0x1b)}\\[[0-?]*[ -/]*[@-~]`, 'g')

function normalizedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedJson)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizedJson(entry)]),
  )
}

function executionArguments(toolName: string, value: unknown): unknown {
  if ((toolName !== 'bash' && toolName !== 'pwsh')
    || typeof value !== 'object'
    || value === null
    || Array.isArray(value)) return value
  const execution = { ...value as Record<string, unknown> }
  delete execution.description
  return execution
}

function canonicalArguments(toolName: string, raw: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Model-produced malformed JSON is a valid durable observation; its raw
    // bytes are the only stable identity available.
    return raw
  }
  return JSON.stringify(normalizedJson(executionArguments(toolName, parsed))) ?? raw
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Identify one Tool call without retaining its potentially large arguments.
 * @param name - Tool name recorded by `tool/call`.
 * @param rawArguments - Exact model-produced argument JSON.
 * @returns Stable SHA-256 fingerprint.
 */
export function toolCallFingerprint(name: string, rawArguments: string): string {
  return digest(`${name}\u0000${canonicalArguments(name, rawArguments)}`)
}

function contentText(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
    case 'reasoning':
      return block.text
    case 'image':
      return '[image]'
    case 'tool-call':
      return `${block.name} ${block.arguments}`
    case 'tool-result':
      return block.content.map(contentText).join('\n')
    default:
      return JSON.stringify(block)
  }
}

function shellFailureIdentity(toolName: string, rendered: string): string | null {
  if (toolName !== 'bash' && toolName !== 'pwsh') return null
  const status = parseExitStatus(rendered)
  if ('signal' in status) return `signal:${status.signal}`
  return status.exitCode === 0 ? null : `exit:${String(status.exitCode)}`
}

/**
 * Identify exact normalized failure evidence.
 * @param toolName - Tool name correlated from the durable call event.
 * @param result - Durable Tool result block.
 * @param internalError - Optional internal failure identity recorded beside the result.
 * @returns Stable fingerprint, or null for a successful result.
 */
export function toolErrorFingerprint(
  toolName: string,
  result: ToolResultBlock,
  internalError: { name: string; code: string } | undefined,
): string | null {
  const rendered = result.content.map(contentText).join('\n')
  const shellFailure = shellFailureIdentity(toolName, rendered)
  if (result.isError !== true && internalError === undefined && shellFailure === null) return null
  const identity = [
    result.isError === true ? 'tool-result:isError' : '',
    internalError === undefined ? '' : `${internalError.name}:${internalError.code}`,
    shellFailure ?? '',
  ].filter(value => value.length > 0).join('|')
  const normalized = `${toolName}\n${identity}\n${rendered}`
    .replace(ANSI_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
  return digest(normalized.length === 0 ? 'tool-error' : normalized)
}
