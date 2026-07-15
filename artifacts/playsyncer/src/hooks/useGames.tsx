import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useListGames } from "@workspace/api-client-react";
import type { Game, GameStatus, Platform } from "@/domain/games/types";
import type { AccountInput } from "@/domain/accounts/types";
import type { CustomerInput } from "@/domain/slots/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameMutations {
  /** Stage B: no-op. Real create/edit will be wired in Stage C. */
  addGame: (data: { title: string; coverUrl: string; platform: Platform; status: GameStatus }) => void;
  editGame: (id: string, data: { title: string; coverUrl: string; platform: Platform; status: GameStatus }) => void;
  toggleGameStatus: (id: string) => void;
  deleteGame: (id: string) => void;
}

export interface AccountMutations {
  /** Stage B: no-op. Account integration is out of scope. */
  addAccount: (gameId: string, data: AccountInput) => void;
  editAccount: (gameId: string, accountId: string, data: AccountInput) => void;
  toggleAccountStatus: (gameId: string, accountId: string) => void;
  deleteAccount: (gameId: string, accountId: string) => void;
}

export interface CapacityMutations {
  /** Stage B: no-op. Capacity integration is out of scope. */
  addCapacityCustomer: (gameId: string, accountId: string, slotId: string, data: CustomerInput) => void;
  editCapacityCustomer: (gameId: string, accountId: string, slotId: string, customerId: string, data: CustomerInput) => void;
  removeCapacityCustomer: (gameId: string, accountId: string, slotId: string, customerId: string) => void;
}

interface GamesContextValue {
  games: Game[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  mutations: GameMutations;
  accountMutations: AccountMutations;
  capacityMutations: CapacityMutations;
}

const GamesContext = createContext<GamesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GamesProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, error, refetch } = useListGames();

  const games = useMemo<Game[]>(() => {
    const apiGames = data?.games ?? [];
    return apiGames.map((apiGame) => ({
      ...apiGame,
      coverUrl: apiGame.coverUrl ?? "",
      accountCount: apiGame.accountCount ?? 0,
    }));
  }, [data]);

  // Stage B: all Game write operations are disabled. No local-only mutation.
  const noOp = useCallback(() => {}, []);

  const addGame: GameMutations["addGame"] = noOp;
  const editGame: GameMutations["editGame"] = noOp;
  const toggleGameStatus: GameMutations["toggleGameStatus"] = noOp;
  const deleteGame: GameMutations["deleteGame"] = noOp;

  // Stage B: Account/Capacity mutations are disabled. They are retained in the
  // context shape only to avoid breaking the contract for other consumers.
  const addAccount: AccountMutations["addAccount"] = noOp;
  const editAccount: AccountMutations["editAccount"] = noOp;
  const toggleAccountStatus: AccountMutations["toggleAccountStatus"] = noOp;
  const deleteAccount: AccountMutations["deleteAccount"] = noOp;

  const addCapacityCustomer: CapacityMutations["addCapacityCustomer"] = noOp;
  const editCapacityCustomer: CapacityMutations["editCapacityCustomer"] = noOp;
  const removeCapacityCustomer: CapacityMutations["removeCapacityCustomer"] = noOp;

  return (
    <GamesContext.Provider
      value={{
        games,
        isLoading,
        isError,
        error,
        refetch,
        mutations: { addGame, editGame, toggleGameStatus, deleteGame },
        accountMutations: {
          addAccount,
          editAccount,
          toggleAccountStatus,
          deleteAccount,
        },
        capacityMutations: {
          addCapacityCustomer,
          editCapacityCustomer,
          removeCapacityCustomer,
        },
      }}
    >
      {children}
    </GamesContext.Provider>
  );
}

export function useGames(): GamesContextValue {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error("useGames must be used inside <GamesProvider>");
  return ctx;
}
