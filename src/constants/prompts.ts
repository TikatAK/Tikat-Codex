import { getCwd } from '../utils/cwd.js'

/**
 * Base system prompt for Tikat-Codex agents.
 * Injected into every API request.
 */
export const BASE_SYSTEM_PROMPT = `You are Tikat-Codex, an expert AI coding assistant.
You have access to tools to read files, write files, run bash commands, search code, and browse the web.
Always use tools to actually perform tasks rather than just describing what to do.
Current working directory will be provided in each request.`

/** Build the full system prompt with the current working directory appended. */
export function buildSystemPrompt(): string {
  return `${BASE_SYSTEM_PROMPT}\nWorking directory: ${getCwd()}`
}
