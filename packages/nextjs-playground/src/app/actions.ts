'use server'

import { execSync } from 'child_process'

export async function exec(command: string): Promise<{ stdout: string } | { error: string }> {
  try {
    return { stdout: execSync(command, { timeout: 10_000 }).toString() }
  } catch (e: any) {
    return { error: e.stderr?.toString() || e.message }
  }
}
