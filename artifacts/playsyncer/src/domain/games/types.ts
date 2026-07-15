import type { Account } from "@/domain/accounts/types";

export type Platform = "PS5_ONLY" | "PS4_AND_PS5" | "PS4_ONLY";

export type GameStatus = "active" | "inactive";

export interface Game {
  id: string;
  title: string;
  cover: string;
  platform: Platform;
  status: GameStatus;
  accounts: Account[];
}
