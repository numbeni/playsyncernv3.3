import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  gamesTable,
  accountsTable,
  accountCapacitiesTable,
  accountBackupCodesTable,
} from "@workspace/db";
import {
  normalizeAccountNumberPrefix,
  buildDisplayNumber,
  buildCapacityDefinitions,
  type CapacityDefinition,
} from "@workspace/db/helpers";
import { eq, isNull, and, max as drizzleMax, desc } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import { p } from "../lib/req-param";
import { toSafeAccount } from "../lib/dto";
import { requireUuidParam } from "../lib/validate-uuid";

const router: IRouter = Router();

// Malformed UUID route params fail fast with HTTP 400 instead of reaching the DB.
router.param("gameId", requireUuidParam("gameId"));
router.param("id", requireUuidParam("id"));

// ── Validation ──────────────────────────────────────────────────────────────

const CreateAccountBody = z.object({
  accountNumberPrefix: z.string().optional(),
  email: z.string().email(),
  /** Stored as-is until encryption middleware is wired up. */
  playstationPassword: z.string().min(1),
  emailPassword: z.string().min(1),
  familyManagementEmail: z.string().email().optional(),
  onlineId: z.string().optional(),
  birthDate: z.string().optional(),
  backupCodes: z.array(z.string()).default([]),
});

const UpdateAccountBody = z.object({
  accountNumberPrefix: z.string().optional(),
  email: z.string().email().optional(),
  playstationPassword: z.string().min(1).optional(),
  emailPassword: z.string().min(1).optional(),
  familyManagementEmail: z.string().email().nullable().optional(),
  onlineId: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function nextAccountCode(): Promise<string> {
  // TODO: replace with a PostgreSQL sequence to eliminate the race window under load.
  const [row] = await db
    .select({ max: drizzleMax(accountsTable.accountCode) })
    .from(accountsTable);
  const n = row?.max ? parseInt(row.max.replace("ACC-", ""), 10) + 1 : 1;
  return `ACC-${String(n).padStart(6, "0")}`;
}

async function nextSeqForGame(gameId: string): Promise<number> {
  // TODO: replace with a per-game PostgreSQL sequence under load.
  const [row] = await db
    .select({ max: drizzleMax(accountsTable.accountNumberSeq) })
    .from(accountsTable)
    .where(eq(accountsTable.gameId, gameId));
  return (row?.max ?? 0) + 1;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** GET /games/:gameId/accounts — list active accounts for a game */
router.get("/games/:gameId/accounts", async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.gameId, p(req.params["gameId"])),
          isNull(accountsTable.deletedAt),
        ),
      )
      .orderBy(desc(accountsTable.createdAt));

    res.json({ accounts: rows.map(toSafeAccount) });
  } catch (err) {
    logger.error(err, "GET /games/:gameId/accounts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /accounts/:id — account detail with capacities and backup codes */
router.get("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const [account] = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.id, p(req.params["id"])))
      .limit(1);

    if (!account || account.deletedAt) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const [capacities, backupCodes] = await Promise.all([
      db
        .select()
        .from(accountCapacitiesTable)
        .where(eq(accountCapacitiesTable.accountId, account.id)),
      db
        .select()
        .from(accountBackupCodesTable)
        .where(eq(accountBackupCodesTable.accountId, account.id)),
    ]);

    res.json({ account: toSafeAccount(account), capacities, backupCodes });
  } catch (err) {
    logger.error(err, "GET /accounts/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /games/:gameId/accounts — create account + auto-generate capacity slots */
router.post("/games/:gameId/accounts", async (req: Request, res: Response) => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }

  const gameId = p(req.params["gameId"]);

  const [game] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId))
    .limit(1);

  if (!game || game.deletedAt) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  try {
    const [accountCode, seq] = await Promise.all([
      nextAccountCode(),
      nextSeqForGame(gameId),
    ]);

    const prefix = normalizeAccountNumberPrefix(
      parsed.data.accountNumberPrefix ?? "",
      game.title,
    );
    const displayNumber = buildDisplayNumber(prefix, seq);

    // All inserts in a single transaction — partial failures leave no orphans.
    const { account, capacities } = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accountsTable)
        .values({
          gameId,
          accountCode,
          accountNumberPrefix: prefix,
          accountNumberSeq: seq,
          displayNumber,
          email: parsed.data.email,
          emailNormalized: parsed.data.email.toLowerCase().trim(),
          playstationPasswordEncrypted: parsed.data.playstationPassword,
          emailPasswordEncrypted: parsed.data.emailPassword,
          familyManagementEmailEncrypted: parsed.data.familyManagementEmail ?? null,
          onlineId: parsed.data.onlineId ?? null,
          birthDate: parsed.data.birthDate ?? null,
        })
        .returning();

      const defs: CapacityDefinition[] = buildCapacityDefinitions(game.platform);
      const capacities = await tx
        .insert(accountCapacitiesTable)
        .values(
          defs.map((d) => ({
            accountId: account.id,
            capacityKind: d.capacityKind,
            instanceNo: d.instanceNo,
            displayLabel: d.displayLabel,
          })),
        )
        .returning();

      if (parsed.data.backupCodes.length > 0) {
        await tx.insert(accountBackupCodesTable).values(
          parsed.data.backupCodes.map((code: string) => ({
            accountId: account.id,
            codeEncrypted: code,
          })),
        );
      }

      return { account, capacities };
    });

    res.status(201).json({ account: toSafeAccount(account), capacities });
  } catch (err: unknown) {
    if (
      typeof err === "object" && err !== null && "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      res.status(409).json({
        error: "An active account with this email already exists for this game",
      });
      return;
    }
    logger.error(err, "POST /games/:gameId/accounts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /accounts/:id — update account fields */
router.patch("/accounts/:id", async (req: Request, res: Response) => {
  const parsed = UpdateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    return;
  }

  const id = p(req.params["id"]);
  const data = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.id, id), isNull(accountsTable.deletedAt)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const update: Partial<typeof accountsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.status !== undefined)
      update.status = data.status;
    if (data.onlineId !== undefined)
      update.onlineId = data.onlineId;
    if (data.birthDate !== undefined)
      update.birthDate = data.birthDate;
    if (data.familyManagementEmail !== undefined)
      update.familyManagementEmailEncrypted = data.familyManagementEmail;
    if (data.email !== undefined) {
      update.email = data.email;
      update.emailNormalized = data.email.toLowerCase().trim();
    }
    if (data.playstationPassword !== undefined)
      update.playstationPasswordEncrypted = data.playstationPassword;
    if (data.emailPassword !== undefined)
      update.emailPasswordEncrypted = data.emailPassword;
    if (data.accountNumberPrefix !== undefined) {
      const newPrefix = normalizeAccountNumberPrefix(
        data.accountNumberPrefix,
        existing.accountNumberPrefix,
      );
      update.accountNumberPrefix = newPrefix;
      update.displayNumber = buildDisplayNumber(newPrefix, existing.accountNumberSeq);
    }

    const [account] = await db
      .update(accountsTable)
      .set(update)
      .where(eq(accountsTable.id, id))
      .returning();

    res.json({ account: toSafeAccount(account) });
  } catch (err) {
    logger.error(err, "PATCH /accounts/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /accounts/:id — soft delete */
router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const [account] = await db
      .update(accountsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(accountsTable.id, p(req.params["id"])),
          isNull(accountsTable.deletedAt),
        ),
      )
      .returning();

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "DELETE /accounts/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
