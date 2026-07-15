import type { Game } from "@/domain/games/types";

export interface GameStats {
  totalAccounts: number;
  activeAccounts: number;
  totalSlots: number;
  totalAssignments: number;
}

export const getGameStats = (game: Game): GameStats => {
  const accounts = game.accounts ?? [];
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((account) => account.status === "active").length;
  const totalSlots = accounts.reduce((count, account) => count + account.slots.length, 0);
  const totalAssignments = accounts.reduce(
    (count, account) =>
      count + account.slots.reduce((slotCount, slot) => slotCount + slot.customers.length, 0),
    0,
  );

  return { totalAccounts, activeAccounts, totalSlots, totalAssignments };
};
