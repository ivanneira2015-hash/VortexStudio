import 'dotenv/config'
import { sql } from '../src/db.js'

async function init() {
  console.log('Creating Vortex tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT,
      stack       TEXT NOT NULL DEFAULT 'flutter',
      target      TEXT NOT NULL DEFAULT 'mobile',
      created_at  TIMESTAMPTZ DEFAULT now(),
      updated_at  TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS generations (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
      prompt        TEXT NOT NULL,
      code          JSONB,
      preview       JSONB,
      model_used    TEXT,
      provider_used TEXT,
      created_at    TIMESTAMPTZ DEFAULT now()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_generations_project ON generations(project_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS shared_apps (
      id         TEXT PRIMARY KEY,
      app_data   JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_shared_apps_expires ON shared_apps(expires_at)
  `

  console.log('Done. Tables: users, projects, generations, shared_apps')
  await sql.end()
}

init().catch(e => { console.error(e); process.exit(1) })
