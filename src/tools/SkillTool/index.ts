/**
 * SkillTool — load and execute user-defined skill definitions.
 *
 * Skills are Markdown files stored in ~/.tikat-codex/skills/<name>.md
 * Each file describes a workflow, set of steps, or domain knowledge.
 *
 * When invoked, the skill's content is returned to the model as a
 * system-level instruction block — the model then follows those instructions
 * to complete the task described in `task`.
 *
 * Example skill file: ~/.tikat-codex/skills/code-review.md
 *   # Code Review Skill
 *   When reviewing code:
 *   1. Check for security vulnerabilities...
 *   2. Verify error handling...
 *   ...
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename, extname } from 'path'
import { homedir } from 'os'
import { z } from 'zod'
import type { ToolDef, ToolContext, ToolResult } from '../base.js'

const SKILLS_DIR = join(homedir(), '.tikat-codex', 'skills')

function ensureSkillsDir(): void {
  mkdirSync(SKILLS_DIR, { recursive: true })
}

function listSkills(): string[] {
  ensureSkillsDir()
  try {
    return readdirSync(SKILLS_DIR)
      .filter(f => extname(f) === '.md')
      .map(f => basename(f, '.md'))
  } catch { return [] }
}

function readSkill(name: string): string | null {
  const filePath = join(SKILLS_DIR, `${name}.md`)
  try {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf8')
  } catch { return null }
}

// ── SkillRun ──────────────────────────────────────────────────────────────────

const runInputSchema = z.object({
  name: z.string().describe('Name of the skill to execute (without .md extension)'),
  task: z
    .string()
    .optional()
    .describe('The specific task or context to apply the skill to. If omitted, returns the skill content for guidance.'),
})

type RunInput = z.infer<typeof runInputSchema>

export const SkillTool: ToolDef<RunInput, string> = {
  name: 'Skill',
  description:
    'Load and apply a user-defined skill. Skills are Markdown files in ~/.tikat-codex/skills/. ' +
    'Each skill provides specialized instructions or workflows. ' +
    'Use SkillList to see available skills. The skill content is returned as a guidance block for you to follow.',
  inputSchema: runInputSchema,

  async execute(input: RunInput, _context: ToolContext): Promise<ToolResult<string>> {
    const content = readSkill(input.name)
    if (!content) {
      const available = listSkills()
      return {
        content:
          `Skill "${input.name}" not found in ${SKILLS_DIR}.\n` +
          (available.length > 0
            ? `Available skills: ${available.join(', ')}`
            : `No skills found. Create a .md file in ${SKILLS_DIR} to define a skill.`),
        isError: true,
      }
    }

    const header = `# Skill: ${input.name}\n\n`
    const taskSection = input.task
      ? `\n\n---\n**Current task:** ${input.task}\n\nFollow the skill instructions above to complete this task.`
      : '\n\n---\nNo specific task provided. Use the skill instructions as guidance for the current context.'

    return { content: header + content.trim() + taskSection }
  },
}

// ── SkillList ─────────────────────────────────────────────────────────────────

export const SkillListTool: ToolDef<Record<never, never>, string> = {
  name: 'SkillList',
  description: `List all available skills from ${SKILLS_DIR}. Returns skill names and first-line descriptions.`,
  inputSchema: z.object({}),

  async execute(_input, _context): Promise<ToolResult<string>> {
    const skills = listSkills()
    if (skills.length === 0) {
      return {
        content:
          `No skills found. Create .md files in ${SKILLS_DIR} to define skills.\n\n` +
          'Example: Create ~/.tikat-codex/skills/code-review.md with instructions for code review.',
      }
    }
    const lines = skills.map(name => {
      const content = readSkill(name) ?? ''
      // Extract first non-empty line as description
      const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim()
      const heading = content.match(/^#\s+(.+)/m)?.[1]?.trim()
      const desc = heading ?? firstLine ?? '(no description)'
      return `• ${name}: ${desc}`
    })
    return { content: `Available skills (${skills.length}):\n${lines.join('\n')}\n\nUse Skill tool with name to execute.` }
  },
}

// ── SkillCreate ───────────────────────────────────────────────────────────────

const createInputSchema = z.object({
  name: z.string().describe('Name for the skill (used as filename, no spaces or .md extension)'),
  content: z.string().describe('Markdown content defining the skill instructions'),
})

type CreateInput = z.infer<typeof createInputSchema>

export const SkillCreateTool: ToolDef<CreateInput, string> = {
  name: 'SkillCreate',
  description:
    `Create a new skill file in ${SKILLS_DIR}. ` +
    'Use Markdown to define instructions, steps, or domain knowledge. ' +
    'Skills can be invoked later with the Skill tool.',
  inputSchema: createInputSchema,

  async execute(input: CreateInput, _context: ToolContext): Promise<ToolResult<string>> {
    // Sanitize name: no slashes, no spaces, no .md suffix
    const safeName = input.name.replace(/[/\\]/g, '').replace(/\.md$/i, '').trim()
    if (!safeName) {
      return { content: 'Invalid skill name.', isError: true }
    }
    ensureSkillsDir()
    const filePath = join(SKILLS_DIR, `${safeName}.md`)
    try {
      writeFileSync(filePath, input.content, 'utf8')
      return { content: `✅ Skill "${safeName}" created at ${filePath}` }
    } catch (err) {
      return { content: `Failed to create skill: ${String(err)}`, isError: true }
    }
  },
}
