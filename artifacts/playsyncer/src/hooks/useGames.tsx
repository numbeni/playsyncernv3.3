import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGames,
  useCreateGame,
  useUpdateGame,
  getListGamesQueryKey,
} from "@workspace/api-client-react";
import type { Game, GameStatus, Platform } from "@/domain/games/types";
import type { AccountInput } from "@/domain/accounts/types";
import type { CustomerInput } from "@/domain/slots/types";
import { formatApiError } from "@/lib/apiErrors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameFormData {
  title: string;
  coverUrl: string;
  platform: Platform;
  status: GameStatus;
}

export interface GameMutations {
  addGame: (data: GameFormData) => Promise<void>;
  editGame: (id: string, data: GameFormData) => Promise<void>;
  toggleGameStatus: (id: string) => Promise<void>;
  deleteGame: (id: string) => void;
}

export interface AccountMutations {
  /** Stage C1: Account integration remains out of scope. */
  addAccount: (gameId: string, data: AccountInput) => void;
  editAccount: (gameId: string, accountId: string, data: AccountInput) => void;
  toggleAccountStatus: (gameId: string, accountId: string) => void;
  deleteAccount: (gameId: string, accountId: string) => void;
}

export interface CapacityMutations {
  /** Stage C1: Capacity integration remains out of scope. */
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
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useListGames();

  const games = useMemo<Game[]>(() => {
    const apiGames = data?.games ?? [];
    return apiGames.map((apiGame) => ({
      ...apiGame,
      coverUrl: apiGame.coverUrl ?? "",
      accountCount: apiGame.accountCount ?? 0,
    }));
  }, [data]);

  // Synchronous ref-based locks prevent duplicate submissions even if the UI
  // disables the button slightly late or rapid events fire across components.
  const createLockRef = useRef(false);
  const updateLockRef = useRef(false);

  const createGame = useCreateGame();
  const updateGame = useUpdateGame();

  // Helper: wait for the active Games list query to refetch before resolving.
  // This ensures the caller can safely close the modal/dialog after synchronization.
  const syncGamesList = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: getListGamesQueryKey(), type: "active" });
  }, [queryClient]);

  const addGame = useCallback(
    async (data: GameFormData) => {
      if (createLockRef.current) return;
      createLockRef.current = true;

      const payload: {
        title: string;
        platform: Platform;
        status: GameStatus;
        coverUrl?: string;
      } = {
        title: data.title.trim(),
        platform: data.platform,
        status: data.status,
      };

      if (data.coverUrl.trim()) {
        payload.coverUrl = data.coverUrl.trim();
      }

      try {
        await createGame.mutateAsync({ data: payload });
        await syncGamesList();
      } catch (err) {
        throw new Error(formatApiError(err));
      } finally {
        createLockRef.current = false;
      }
    },
    [createGame, syncGamesList],
  );

  const editGame = useCallback(
    async (id: string, data: GameFormData) => {
      if (updateLockRef.current) return;
      updateLockRef.current = true;

      const payload = {
        title: data.title.trim(),
        platform: data.platform,
        status: data.status,
        coverUrl: data.coverUrl.trim() ? data.coverUrl.trim() : null,
      };

      try {
        await updateGame.mutateAsync({ id, data: payload });
        await syncGamesList();
      } catch (err) {
        throw new Error(formatApiError(err));
      } finally {
        updateLockRef.current = false;
      }
    },
    [updateGame, syncGamesList],
  );

  const toggleGameStatus = useCallback(
    async (id: string) => {
      const game = games.find((g) => g.id === id);
      if (!game) return;
      if (updateLockRef.current) return;
      updateLockRef.current = true;

      const nextStatus = game.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      try {
        await updateGame.mutateAsync({ id, data: { status: nextStatus } });
        await syncGamesList();
      } catch (err) {
        throw new Error(formatApiError(err));
      } finally {
        updateLockRef.current = false;
      }
    },
    [games, updateGame, syncGamesList],
  );

  // Stage C1: Delete remains out of scope.
  const deleteGame = useCallback(() => {}, []);

  // Stage C1: Account/Capacity mutations remain disabled.
  const addAccount: AccountMutations["addAccount"] = useCallback(() => {}, []);
  const editAccount: AccountMutations["editAccount"] = useCallback(() => {}, []);
  const toggleAccountStatus: AccountMutations["toggleAccountStatus"] = useCallback(() => {}, []);
  const deleteAccount: AccountMutations["deleteAccount"] = useCallback(() => {}, []);

  const addCapacityCustomer: CapacityMutations["addCapacityCustomer"] = useCallback(() => {}, []);
  const editCapacityCustomer: CapacityMutations["editCapacityCustomer"] = useCallback(() => {}, []);
  const removeCapacityCustomer: CapacityMutations["removeCapacityCustomer"] = useCallback(() => {}, []);

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
