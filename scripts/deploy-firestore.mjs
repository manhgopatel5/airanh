#!/usr/bin/env node
/**
 * Deploy Firestore rules + indexes to Firebase.
 * Requires one of:
 *   - FIREBASE_TOKEN (from `firebase login:ci`)
 *   - FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ optional FIREBASE_PROJECT_ID)
 *   - GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON file
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'airanh-ba64c'

function loadDotEnv(path) {
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnv('.env')
loadDotEnv('.env.local')
loadDotEnv('.env.production')

let tempCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!tempCredPath && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  const dir = mkdtempSync(join(tmpdir(), 'firebase-sa-'))
  tempCredPath = join(dir, 'service-account.json')
  writeFileSync(
    tempCredPath,
    JSON.stringify({
      type: 'service_account',
      project_id: PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  )
}

const hasToken = !!process.env.FIREBASE_TOKEN
const hasCreds = !!tempCredPath && existsSync(tempCredPath)
const hasSaEnv = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)

if (!hasToken && !hasCreds && !hasSaEnv) {
  console.error('Missing Firebase deploy credentials.')
  console.error('Set FIREBASE_TOKEN, or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.')
  process.exit(1)
}

const env = { ...process.env }
if (tempCredPath) env.GOOGLE_APPLICATION_CREDENTIALS = tempCredPath

const tokenArg = hasToken ? `--token "${process.env.FIREBASE_TOKEN}"` : ''
const cmd = `npx firebase-tools@15.22.3 deploy --only firestore:rules,firestore:indexes --project ${PROJECT_ID} --non-interactive ${tokenArg}`.trim()

console.log(`Deploying Firestore rules + indexes to project: ${PROJECT_ID}`)
execSync(cmd, { stdio: 'inherit', env })
console.log('Firestore deploy complete.')
