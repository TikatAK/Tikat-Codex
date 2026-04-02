import type { AnthropicToolUseBlock } from '../adapters/openai/responseAdapter.js'

/** Mutable accumulator entry built up from streaming input_json_delta events */
export interface ToolAccEntry {
  id: string
  name: string
  argsJson: string
}

/** Parse a completed accumulator map into AnthropicToolUseBlock[] */
export function finalizeToolUseBlocks(
  accumulator: Map<number, ToolAccEntry>,
): AnthropicToolUseBlock[] {
  const blocks: AnthropicToolUseBlock[] = []
  for (const [, acc] of accumulator) {
    let parsedInput: unknown = {}
    try { parsedInput = JSON.parse(acc.argsJson || '{}') } catch { parsedInput = {} }
    blocks.push({ type: 'tool_use', id: acc.id, name: acc.name, input: parsedInput })
  }
  return blocks
}
