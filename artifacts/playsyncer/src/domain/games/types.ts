import type { Account } from "@/domain/accounts/types";

export type Platform = "PS5_ONLY" | "PS4_AND_PS5" | "PS4_ONLY";

export type GameStatus = "ACTIVE" | "INACTIVE";

export interface Game {
  id: string;
  title: string;
  titleNormalized?: string;
  coverUrl: string;
  platform: Platform;
  status: GameStatus;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  /** Accounts remain a local-state concern during PS-02B (backend integration out of scope). */
  accounts: Account[];
}
