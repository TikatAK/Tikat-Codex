import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, copyFileSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { StoredProviderSettings } from '../../providers/types.js'

const CONFIG_DIR = join(homedir(), '.tikat-codex')
const LEGACY_CONFIG_DIR = join(homedir(), '.tikatak-codex')  // old name before v1.3.0
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json')
const APIKEY_FILE = join(CONFIG_DIR, 'apikey')

export interface Settings {
  provider?: StoredProviderSettings
  model?: string
  theme?: 'dark' | 'light'
  vim?: boolean
  [key: string]: unknown
}

/** Auto-migrate config from old ~/.tikatak-codex to ~/.tikat-codex (one-time, silent) */
function migrateLegacyConfig(): void {
  if (existsSync(CONFIG_DIR) || !existsSync(LEGACY_CONFIG_DIR)) return
  try {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
    for (const file of readdirSync(LEGACY_CONFIG_DIR)) {
      const src = join(LEGACY_CONFIG_DIR, file)
      const dst = join(CONFIG_DIR, file)
      if (!existsSync(dst)) copyFileSync(src, dst)
    }
  } catch { /* silent — don't block startup */ }
}

// Run migration once at module load
migrateLegacyConfig()

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
}

export function readSettings(): Settings {
  try {
    if (!existsSync(SETTINGS_FILE)) return {}
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) as Settings
  } catch {
    return {}
  }
}

export function writeSettings(settings: Settings): void {
  ensureConfigDir()
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), { encoding: 'utf8', mode: 0o600 })
}

export function updateSettings(patch: Partial<Settings>): void {
  const current = readSettings()
  writeSettings({ ...current, ...patch })
}

/** Save API key to a separate file with restricted permissions */
export function saveApiKey(apiKey: string): void {
  ensureConfigDir()
  writeFileSync(APIKEY_FILE, apiKey, { encoding: 'utf8', mode: 0o600 })
}

/** Read stored API key */
export function readApiKey(): string | null {
  try {
    if (!existsSync(APIKEY_FILE)) return null
    const key = readFileSync(APIKEY_FILE, 'utf8').trim()
    return key || null
  } catch {
    return null
  }
}

/** Delete stored API key */
export function deleteApiKey(): void {
  try {
    if (existsSync(APIKEY_FILE)) {
      unlinkSync(APIKEY_FILE)
    }
  } catch { /* ignore */ }
}

export function getConfigDir(): string {
  return CONFIG_DIR
}
