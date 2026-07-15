import { platformLabel } from "@/domain/games/platform";
import type { Game } from "@/domain/games/types";
import type { SearchHit } from "@/domain/search/types";
import { normalizeOrderId, isValidOrderId } from "@/domain/slots/normalizeOrderId";

function matchesOrderId(orderId: string, q: string): boolean {
  if (orderId.toLowerCase().includes(q.toLowerCase())) return true;
  const normalizedQ = normalizeOrderId(q);
  if (isValidOrderId(normalizedQ) && orderId.toUpperCase() === normalizedQ) return true;
  return false;
}

function matchesAccountCode(accountCode: string, q: string): boolean {
  const code = accountCode.toLowerCase();
  const qLow = q.toLowerCase();

  if (code.includes(qLow)) return true;
  if (code.replace(/-/g, "").includes(qLow.replace(/-/g, ""))) return true;

  const codeNum = parseInt(code.replace(/^acc-?0*/i, "") || "0", 10);
  const qDigitsOnly = qLow.replace(/[^0-9]/g, "");
  if (qDigitsOnly && parseInt(qDigitsOnly, 10) === codeNum) return true;

  return false;
}

export const runSmartSearch = (sourceGames: Game[], query: string): SearchHit[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const gameHits: SearchHit[] = [];
  const accountHits: SearchHit[] = [];
  const customerHits: SearchHit[] = [];

  for (const game of sourceGames) {
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
        sublabel: `${platformLabel(game.platform)} · ${game.status === "ACTIVE" ? "فعال" : "غیرفعال"}`,
      });
    }

    for (const account of game.accounts ?? []) {
      const accountCodeMatch = matchesAccountCode(account.accountCode, q);

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
          label: `${account.accountCode} · ${account.number}`,
          sublabel: `${account.email} · ${game.title}`,
          matchedBy,
        });
      }

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

  return [...gameHits, ...accountHits, ...customerHits].slice(0, 20);
};
