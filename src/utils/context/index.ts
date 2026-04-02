import type { AnthropicMessage } from '../../adapters/openai/index.js'

const MAX_MESSAGES_BEFORE_COMPRESS = 40
const MIN_MESSAGES_TO_KEEP = 10

/**
 * Compress context when history gets too long.
 * Returns compressed messages array and whether compression occurred.
 */
export function compressContext(
  messages: AnthropicMessage[],
): { messages: AnthropicMessage[]; compressed: boolean } {
  if (messages.length <= MAX_MESSAGES_BEFORE_COMPRESS) {
    return { messages, compressed: false }
  }

  const kept = messages.slice(-MIN_MESSAGES_TO_KEEP)
  const droppedCount = messages.length - MIN_MESSAGES_TO_KEEP
  const summaryMsg: AnthropicMessage = {
    role: 'user',
    content: `[系统: 对话历史已压缩，前 ${droppedCount} 条消息已省略以节省 token。请基于以下对话继续。]`,
  }

  return { messages: [summaryMsg, ...kept], compressed: true }
}

/**
 * Estimate token count. Rough: 1 token ≈ 4 chars.
 */
export function estimateTokens(messages: AnthropicMessage[]): number {
  let chars = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      chars += msg.content.length
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (typeof block === 'object' && block !== null) {
          const b = block as unknown as Record<string, unknown>
          if (typeof b['text'] === 'string') chars += b['text'].length
          else if (typeof b['content'] === 'string') chars += b['content'].length
        }
      }
    }
  }
  return Math.ceil(chars / 4)
}
