import { app } from "electron";
import Database from "better-sqlite3";
import * as path from "path";

let db: Database.Database | null = null;

export interface RewriteRecord {
  id: number;
  input_text: string;
  output_text: string;
  system_prompt: string;
  model: string;
  created_at: string;
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath("userData"), "morph.db");
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS rewrites (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      input_text    TEXT NOT NULL,
      output_text   TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      model         TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rewrites_created_at ON rewrites(created_at DESC);
  `);

  return db;
}

export function insertRewrite(input: string, output: string, systemPrompt: string, model: string): RewriteRecord {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO rewrites (input_text, output_text, system_prompt, model) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(input, output, systemPrompt, model);
  return db.prepare("SELECT * FROM rewrites WHERE id = ?").get(result.lastInsertRowid) as RewriteRecord;
}

export function getHistory(limit: number = 50, offset: number = 0): RewriteRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM rewrites ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as RewriteRecord[];
}

export function deleteRewrite(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM rewrites WHERE id = ?").run(id);
}

export function clearHistory(): void {
  const db = getDb();
  db.prepare("DELETE FROM rewrites").run();
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
