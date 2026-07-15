import { platformLabel } from "@/domain/games/platform";
import type { Game } from "@/domain/games/types";
import type { SearchHit } from "@/domain/search/types";
import { normalizeOrderId, isValidOrderId } from "@/domain/slots/normalizeOrderId";

// ---------------------------------------------------------------------------
// OrderId cross-format matching
// ---------------------------------------------------------------------------

/**
 * Match a stored orderId (e.g. "ORD-200") against a raw query string.
 *
 * Supports:
 *   "200"     → matches ORD-200  (raw number query)
 *   "ORD-200" → matches ORD-200  (exact)
 *   "ord-200" → matches ORD-200  (case-insensitive substring)
 */
function matchesOrderId(orderId: string, q: string): boolean {
  // 1. Direct case-insensitive substring (covers "ORD-200", "ord-200", "10248")
  if (orderId.toLowerCase().includes(q.toLowerCase())) return true;
  // 2. Normalise the query — if it resolves to a valid ORD-N, compare directly
  const normalizedQ = normalizeOrderId(q);
  if (isValidOrderId(normalizedQ) && orderId.toUpperCase() === normalizedQ) return true;
  return false;
}

// ---------------------------------------------------------------------------
// AccountCode normalised matching
// ---------------------------------------------------------------------------

/**
 * Test whether a search query matches an accountCode such as "ACC-000128".
 *
 * Supported query formats (case-insensitive, whitespace-trimmed):
 *   ACC-000128  →  exact
 *   acc-000128  →  case-insensitive
 *   000128      →  numeric part with leading zeros
 *   128         →  short numeric (leading zeros stripped)
 *   ACC128      →  compact (prefix + number, no dash)
 *   acc128      →  compact lower-case
 */
function matchesAccountCode(accountCode: string, q: string): boolean {
  const code = accountCode.toLowerCase(); // "acc-000128"
  const qLow = q.toLowerCase();

  // 1. Direct substring — covers "acc-000128", "000128", "128" (all contained in code)
  if (code.includes(qLow)) return true;

  // 2. Without dashes on both sides — covers "acc000128"
  if (code.replace(/-/g, "").includes(qLow.replace(/-/g, ""))) return true;

  // 3. Numeric-part cross-format match — covers "ACC128", "acc128", plain "128", "000128"
  //    Extract the integer value from accountCode ("128") and compare to the integer in q.
  const codeNum = parseInt(code.replace(/^acc-?0*/i, "") || "0", 10);
  const qDigitsOnly = qLow.replace(/[^0-9]/g, "");
  if (qDigitsOnly && parseInt(qDigitsOnly, 10) === codeNum) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

/**
 * Priority order: Games → Accounts → Customers.
 * Sensitive fields (password, backup codes) are matched but the matched value
 * is never surfaced — only a `matchedBy` label is returned.
 */
export const runSmartSearch = (sourceGames: Game[], query: string): SearchHit[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const gameHits: SearchHit[] = [];
  const accountHits: SearchHit[] = [];
  const customerHits: SearchHit[] = [];

  for (const game of sourceGames) {
    // ── Game fields ──────────────────────────────────────────────────────────
    const gameMatches =
      game.title.toLowerCase().includes(q) ||
      game.id.toLowerCase().includes(q) ||
      platformLabel(game.platform).toLowerCase().includes(q) ||
      game.status.toLowerCase().includes(q);

    if (gameMatches) {
      gameHits.push({
        kind: "game",
        gameId: game.id,
        gameTitle: game.title,
        label: game.title,
        sublabel: `${platformLabel(game.platform)} · ${game.status === "active" ? "فعال" : "غیرفعال"}`,
      });
    }

    // ── Account fields ───────────────────────────────────────────────────────
    for (const account of game.accounts) {
      // Global account code — with normalised matching
      const accountCodeMatch = matchesAccountCode(account.accountCode, q);

      // Non-sensitive plain-text fields
      const nonSensitiveMatch =
        accountCodeMatch ||
        account.number.toLowerCase().includes(q) ||
        account.numberPrefix.toLowerCase().includes(q) ||
        account.email.toLowerCase().includes(q) ||
        account.emailPassword.toLowerCase().includes(q) ||
        account.onlineId.toLowerCase().includes(q) ||
        account.birthDate.toLowerCase().includes(q) ||
        account.familyManagementEmail.toLowerCase().includes(q) ||
        account.status.toLowerCase().includes(q);

      // Sensitive fields — match but never expose the value
      const matchedByPassword = account.password.toLowerCase().includes(q);
      const matchedByBackupCode = account.backupCodes.some((c) =>
        c.toLowerCase().includes(q),
      );

      if (nonSensitiveMatch || matchedByPassword || matchedByBackupCode) {
        const matchedBy = accountCodeMatch
          ? "Matched by Account ID"
          : matchedByPassword
            ? "Matched by PlayStation Password"
            : matchedByBackupCode
              ? "Matched by 2-step verification code"
              : undefined;

        accountHits.push({
          kind: "account",
          gameId: game.id,
          gameTitle: game.title,
          accountId: account.id,
          accountNumber: account.number,
          // Label shows both identifiers so admins always see the global code
          label: `${account.accountCode} · ${account.number}`,
          sublabel: `${account.email} · ${game.title}`,
          matchedBy,
        });
      }

      // ── Capacity / customer fields ─────────────────────────────────────────
      for (const slot of account.slots) {
        for (const customer of slot.customers) {
          const customerMatches =
            customer.phone.toLowerCase().includes(q) ||
            matchesOrderId(customer.orderId, q) ||
            (customer.note?.toLowerCase().includes(q) ?? false);

          if (customerMatches) {
            customerHits.push({
              kind: "customer",
              gameId: game.id,
              gameTitle: game.title,
              accountId: account.id,
              accountNumber: account.number,
              label: `${customer.orderId} — ${customer.phone}`,
              sublabel: `${game.title} · ${account.number} · ${slot.label}`,
            });
          }
        }
      }
    }
  }

  // Priority: Games → Accounts → Customers
  return [...gameHits, ...accountHits, ...customerHits].slice(0, 20);
};
