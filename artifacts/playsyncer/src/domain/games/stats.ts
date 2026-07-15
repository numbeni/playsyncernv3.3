import type { Game } from "@/domain/games/types";

export interface GameStats {
  totalAccounts: number;
  activeAccounts: number;
  totalSlots: number;
  totalAssignments: number;
}

export const getGameStats = (game: Game): GameStats => {
  const totalAccounts = game.accounts.length;
  const activeAccounts = game.accounts.filter((account) => account.status === "active").length;
  const totalSlots = game.accounts.reduce((count, account) => count + account.slots.length, 0);
  const totalAssignments = game.accounts.reduce(
    (count, account) =>
      count + account.slots.reduce((slotCount, slot) => slotCount + slot.customers.length, 0),
    0,
  );

  return { totalAccounts, activeAccounts, totalSlots, totalAssignments };
};
