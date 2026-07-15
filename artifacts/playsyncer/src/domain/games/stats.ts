import type { Game } from "@/domain/games/types";

export interface GameStats {
  /** Total Accounts for this Game, as reported by the backend. */
  totalAccounts: number;
}

export const getGameStats = (game: Game): GameStats => {
  return { totalAccounts: game.accountCount };
};
