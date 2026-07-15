import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { startTestPg } from "../src/lib/test-pg.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "lib",
  "db",
  "migrations",
);

function runSqlFile(databaseUrl: string, file: string) {
  try {
    execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -f "${file}"`, {
      stdio: ["ignore", "ignore", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString();
    if (stderr) console.error(stderr);
    throw err;
  }
}

function runSql(databaseUrl: string, sql: string) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "playsyncer-migration-sql-"));
  const file = path.join(tmpDir, "query.sql");
  writeFileSync(file, sql);
  try {
    execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -f "${file}"`, {
      stdio: "ignore",
    });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function querySql(databaseUrl: string, sql: string): string {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "playsyncer-migration-sql-"));
  const file = path.join(tmpDir, "query.sql");
  writeFileSync(file, sql);
  try {
    return execSync(
      `psql "${databaseUrl}" -v ON_ERROR_STOP=1 -P pager=off -t -f "${file}"`,
      {
        encoding: "utf-8",
      },
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function verifySuccessfulUpgrade() {
  const { databaseUrl, stop } = await startTestPg({ skipMigrations: true });
  try {
    runSqlFile(databaseUrl, path.join(MIGRATIONS_DIR, "0000_zippy_leech.sql"));

    runSql(
      databaseUrl,
      `INSERT INTO "games" ("title", "platform", "status") VALUES
        ('  fc 26  ', 'PS5_ONLY', 'active'),
        ('FC   27', 'PS5_ONLY', 'inactive'),
        ('Other Game', 'PS4_ONLY', 'active');`,
    );

    runSqlFile(databaseUrl, path.join(MIGRATIONS_DIR, "0001_glossy_onslaught.sql"));

    const count = querySql(
      databaseUrl,
      `SELECT count(*) FROM "games";`,
    );
    console.log("Row count: " + count);

    const rows = querySql(
      databaseUrl,
      `SELECT "title", "title_normalized", "status" FROM "games" ORDER BY "title_normalized";`,
    );

    console.log("Upgraded games:\n" + JSON.stringify(rows));

    assert.ok(rows.includes("fc 26"), "lowercase title should be cleaned and preserved");
    assert.ok(rows.includes("FC 27"), "uppercase title should be cleaned and preserved");
    assert.ok(rows.includes("fc 27"), "normalized title should be lowercase");
    assert.ok(
      rows.includes("Other Game"),
      "other display title should be preserved",
    );
    assert.ok(
      rows.includes("other game"),
      "other normalized title should be lowercase",
    );
    assert.ok(rows.includes("ACTIVE"), "status should be uppercase ACTIVE");
    assert.ok(rows.includes("INACTIVE"), "status should be uppercase INACTIVE");

    console.log("Populated upgrade verification passed.");
  } finally {
    await stop();
  }
}

async function verifyConflictFailure() {
  const { databaseUrl, stop } = await startTestPg({ skipMigrations: true });
  try {
    runSqlFile(databaseUrl, path.join(MIGRATIONS_DIR, "0000_zippy_leech.sql"));

    runSql(
      databaseUrl,
      `INSERT INTO "games" ("title", "platform", "status") VALUES
        ('FC 26', 'PS5_ONLY', 'active'),
        ('fc 26', 'PS4_ONLY', 'inactive');`,
    );

    let error: Error | undefined;
    try {
      runSqlFile(
        databaseUrl,
        path.join(MIGRATIONS_DIR, "0001_glossy_onslaught.sql"),
      );
    } catch (err) {
      error = err as Error;
    }

    assert.ok(
      error,
      "migration should fail on conflicting normalized titles",
    );
    const message = String(error);
    assert.ok(
      message.includes("conflicting normalized titles exist") ||
        message.includes("duplicate key value violates unique constraint"),
      "error should mention conflicting normalized titles: " + message,
    );

    console.log("Conflict failure verification passed.");
  } finally {
    await stop();
  }
}

async function main() {
  await verifySuccessfulUpgrade();
  await verifyConflictFailure();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
