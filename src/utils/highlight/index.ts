/**
 * Lightweight terminal code syntax highlighter using chalk.
 * Detects Markdown fenced code blocks and applies color to common language tokens.
 */

// ANSI escape codes (works in terminal, stripped by strip-ansi if needed)
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Colors
  keyword: '\x1b[35m',    // magenta  — keywords
  string: '\x1b[32m',     // green    — strings
  number: '\x1b[33m',     // yellow   — numbers
  comment: '\x1b[90m',    // gray     — comments
  builtin: '\x1b[36m',    // cyan     — builtins / types
  operator: '\x1b[34m',   // blue     — operators
  codeFence: '\x1b[90m',  // gray     — ``` fence line
  langLabel: '\x1b[36m',  // cyan     — language name
}

const KEYWORDS = new Set([
  // JS/TS
  'const', 'let', 'var', 'function', 'class', 'return', 'if', 'else', 'for', 'while',
  'import', 'export', 'default', 'from', 'async', 'await', 'new', 'this', 'typeof',
  'instanceof', 'throw', 'try', 'catch', 'finally', 'switch', 'case', 'break', 'continue',
  'type', 'interface', 'enum', 'extends', 'implements', 'namespace', 'declare',
  // Python
  'def', 'lambda', 'with', 'as', 'pass', 'del', 'yield', 'raise', 'in', 'not', 'and', 'or',
  'True', 'False', 'None',
  // Go
  'func', 'go', 'defer', 'chan', 'select', 'fallthrough', 'range', 'map', 'struct',
  // Rust
  'fn', 'let', 'mut', 'use', 'mod', 'pub', 'impl', 'trait', 'where', 'self', 'Self',
  // Common
  'null', 'undefined', 'true', 'false', 'static', 'void', 'int', 'string', 'bool',
])

const BUILTINS = new Set([
  'console', 'process', 'require', 'module', 'exports', 'Promise', 'Array', 'Object',
  'String', 'Number', 'Boolean', 'Error', 'Map', 'Set', 'JSON', 'Math', 'Date',
  'setTimeout', 'clearTimeout', 'setInterval', 'print', 'len', 'range', 'list', 'dict',
  'fmt', 'os', 'fs', 'path', 'http',
])

function highlightLine(line: string): string {
  // Inline code `...`
  line = line.replace(/`([^`]+)`/g, (_, code) => `${C.builtin}\`${code}\`${C.reset}`)
  // Single-line comment
  if (/^\s*(\/\/|#|--)\s/.test(line)) return C.comment + line + C.reset
  // Strings  (double, single, backtick)
  line = line.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, m => `${C.string}${m}${C.reset}`)
  // Numbers
  line = line.replace(/\b(\d+\.?\d*)\b/g, m => `${C.number}${m}${C.reset}`)
  // Keywords & builtins (word boundaries)
  line = line.replace(/\b([a-zA-Z_]\w*)\b/g, word => {
    if (KEYWORDS.has(word)) return `${C.keyword}${word}${C.reset}`
    if (BUILTINS.has(word)) return `${C.builtin}${word}${C.reset}`
    return word
  })
  return line
}

/**
 * Apply terminal syntax highlighting to a string that may contain markdown code blocks.
 * Fenced blocks (```lang ... ```) are highlighted; prose is returned as-is.
 */
export function highlight(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inCode = false
  let lang = ''

  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w*)$/)
    if (fenceMatch) {
      if (!inCode) {
        inCode = true
        lang = fenceMatch[1] ?? ''
        const label = lang ? ` ${lang}` : ''
        out.push(`${C.codeFence}───${C.langLabel}${label}${C.reset}`)
      } else {
        inCode = false
        lang = ''
        out.push(`${C.codeFence}───${C.reset}`)
      }
      continue
    }

    if (inCode) {
      // Apply highlighting for common languages
      if (['js', 'ts', 'jsx', 'tsx', 'javascript', 'typescript', 'python', 'py',
           'go', 'rust', 'rs', 'sh', 'bash', 'zsh', 'java', 'c', 'cpp', ''].includes(lang)) {
        out.push(highlightLine(line))
      } else {
        out.push(line)  // unknown language: no highlight
      }
    } else {
      // Bold **text** and *text*
      let prose = line
        .replace(/\*\*(.+?)\*\*/g, `${C.bold}$1${C.reset}`)
        .replace(/\*(.+?)\*/g, `${C.dim}$1${C.reset}`)
      out.push(prose)
    }
  }

  return out.join('\n')
}
