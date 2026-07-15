import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useListGames } from "@workspace/api-client-react";
import { games as mockGames } from "@/mocks/playSyncerMockData";
import type { Game, GameStatus, Platform } from "@/domain/games/types";
import type { Account, AccountInput } from "@/domain/accounts/types";
import type { AccountSlot, CustomerInput } from "@/domain/slots/types";
import { normalizeAccountPrefix } from "@/domain/accounts/numberPrefix";
import { normalizeOrderId } from "@/domain/slots/normalizeOrderId";

// ---------------------------------------------------------------------------
// Helpers (kept for local Account/Capacity state, which is out of PS-02B scope)
// ---------------------------------------------------------------------------

function generateSlots(platform: Platform, accountId: string): AccountSlot[] {
  const ts = Date.now();
  const id = (suffix: string) => `${accountId}-slot-${suffix}-${ts}`;

  if (platform === "PS4_ONLY") {
    return [{ id: id("z2ps4-1"), type: "Z2_PS4_1", label: "Z2 PS4", customers: [] }];
  }

  const slots: AccountSlot[] = [
    { id: id("z2ps5-1"), type: "Z2_PS5_1", label: "Z2 PS5 #1", customers: [] },
    { id: id("z2ps5-2"), type: "Z2_PS5_2", label: "Z2 PS5 #2", customers: [] },
  ];
  if (platform === "PS4_AND_PS5") {
    slots.push({ id: id("z2ps4-1"), type: "Z2_PS4_1", label: "Z2 PS4", customers: [] });
  }
  slots.push({ id: id("z3ps5"), type: "Z3_PS5", label: "Z3 PS5", customers: [] });
  return slots;
}

function generateAccountNumber(prefix: string, accounts: Account[]): string {
  const max = accounts.reduce((m, a) => {
    const match = a.number.match(/(\d+)$/);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `#${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function resolvePrefix(inputPrefix: string | undefined, gameTitle: string): string {
  const raw = inputPrefix?.trim();
  return normalizeAccountPrefix(raw && raw.length > 0 ? raw : gameTitle);
}

function generateAccountCode(games: Game[]): string {
  let max = 0;
  for (const g of games) {
    for (const a of g.accounts) {
      const match = a.accountCode.match(/(\d+)$/);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return `ACC-${String(max + 1).padStart(6, "0")}`;
}

function generateCustomerId(slotId: string): string {
  return `${slotId}-cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayJalali(): string {
  return new Date().toLocaleDateString("fa-IR-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/-/g, "/");
}

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
  addAccount: (gameId: string, data: AccountInput) => void;
  editAccount: (gameId: string, accountId: string, data: AccountInput) => void;
  toggleAccountStatus: (gameId: string, accountId: string) => void;
  deleteAccount: (gameId: string, accountId: string) => void;
}

export interface CapacityMutations {
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
  // Games are now authoritative from the backend (PS-02A). Account data stays
  // local/mock until the Account backend integration phase, so we keep the
  // original mock accounts keyed by game ID. Real API games use UUIDs and will
  // not accidentally merge with legacy mock game IDs.
  const [accountsByGameId] = useState<Record<string, Account[]>>(() => {
    const map: Record<string, Account[]> = {};
    for (const game of mockGames) {
      map[game.id] = game.accounts;
    }
    return map;
  });

  const { data, isLoading, isError, error, refetch } = useListGames();

  const games = useMemo<Game[]>(() => {
    const apiGames = data?.games ?? [];
    return apiGames.map((apiGame) => ({
      ...apiGame,
      coverUrl: apiGame.coverUrl ?? "",
      accounts: accountsByGameId[apiGame.id] ?? [],
    }));
  }, [data, accountsByGameId]);

  // -- Game mutations (Stage B: disabled — no local-only mutation) ------------

  const noOpGame = useCallback(() => {
    // eslint-disable-next-line no-console
    console.warn("PS-02B Stage B: Game write operations are disabled until Stage C.");
  }, []);

  const addGame: GameMutations["addGame"] = noOpGame;
  const editGame: GameMutations["editGame"] = noOpGame;
  const toggleGameStatus: GameMutations["toggleGameStatus"] = noOpGame;
  const deleteGame: GameMutations["deleteGame"] = noOpGame;

  // -- Account mutations (local state, unchanged for PS-02B) --------------------

  const [localGames, setLocalGames] = useState<Game[]>(() => mockGames);

  const addAccount = useCallback<AccountMutations["addAccount"]>((gameId, data) => {
    setLocalGames((prev) => {
      const accountCode = generateAccountCode(prev);
      return prev.map((g) => {
        if (g.id !== gameId) return g;
        const id = `${gameId}-acc-${Date.now()}`;
        const prefix = resolvePrefix(data.numberPrefix, g.title);
        const newAccount: Account = {
          ...data,
          id,
          accountCode,
          numberPrefix: prefix,
          number: generateAccountNumber(prefix, g.accounts),
          slots: generateSlots(g.platform, id),
        };
        return { ...g, accounts: [...g.accounts, newAccount] };
      });
    });
  }, []);

  const editAccount = useCallback<AccountMutations["editAccount"]>(
    (gameId, accountId, data) => {
      setLocalGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          const accounts = g.accounts.map((a) => {
            if (a.id !== accountId) return a;
            const newPrefix = resolvePrefix(data.numberPrefix, g.title);
            let number = a.number;
            if (newPrefix !== a.numberPrefix) {
              const seqMatch = a.number.match(/(\d+)$/);
              const seq = seqMatch ? seqMatch[1] : "001";
              number = `#${newPrefix}-${seq}`;
            }
            return {
              ...a,
              ...data,
              id: a.id,
              accountCode: a.accountCode,
              numberPrefix: newPrefix,
              number,
              slots: a.slots,
            };
          });
          return { ...g, accounts };
        }),
      );
    },
    [],
  );

  const toggleAccountStatus = useCallback<AccountMutations["toggleAccountStatus"]>(
    (gameId, accountId) => {
      setLocalGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          const accounts = g.accounts.map((a) =>
            a.id === accountId
              ? { ...a, status: a.status === "active" ? ("disabled" as const) : ("active" as const) }
              : a,
          );
          return { ...g, accounts };
        }),
      );
    },
    [],
  );

  const deleteAccount = useCallback<AccountMutations["deleteAccount"]>((gameId, accountId) => {
    setLocalGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        return { ...g, accounts: g.accounts.filter((a) => a.id !== accountId) };
      }),
    );
  }, []);

  const addCapacityCustomer = useCallback<CapacityMutations["addCapacityCustomer"]>(
    (gameId, accountId, slotId, data) => {
      setLocalGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          return {
            ...g,
            accounts: g.accounts.map((a) => {
              if (a.id !== accountId) return a;
              return {
                ...a,
                slots: a.slots.map((s) => {
                  if (s.id !== slotId) return s;
                  const newCustomer = {
                    id: generateCustomerId(slotId),
                    phone: data.phone,
                    orderId: normalizeOrderId(data.orderId),
                    note: data.note,
                    createdAt: todayJalali(),
                  };
                  return { ...s, customers: [...s.customers, newCustomer] };
                }),
              };
            }),
          };
        }),
      );
    },
    [],
  );

  const editCapacityCustomer = useCallback<CapacityMutations["editCapacityCustomer"]>(
    (gameId, accountId, slotId, customerId, data) => {
      setLocalGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          return {
            ...g,
            accounts: g.accounts.map((a) => {
              if (a.id !== accountId) return a;
              return {
                ...a,
                slots: a.slots.map((s) => {
                  if (s.id !== slotId) return s;
                  return {
                    ...s,
                    customers: s.customers.map((c) =>
                      c.id !== customerId
                        ? c
                        : { ...c, phone: data.phone, orderId: normalizeOrderId(data.orderId), note: data.note },
                    ),
                  };
                }),
              };
            }),
          };
        }),
      );
    },
    [],
  );

  const removeCapacityCustomer = useCallback<CapacityMutations["removeCapacityCustomer"]>(
    (gameId, accountId, slotId, customerId) => {
      setLocalGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          return {
            ...g,
            accounts: g.accounts.map((a) => {
              if (a.id !== accountId) return a;
              return {
                ...a,
                slots: a.slots.map((s) => {
                  if (s.id !== slotId) return s;
                  return { ...s, customers: s.customers.filter((c) => c.id !== customerId) };
                }),
              };
            }),
          };
        }),
      );
    },
    [],
  );

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
