import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { games as initialGames } from "@/mocks/playSyncerMockData";
import type { Game, GameStatus, Platform } from "@/domain/games/types";
import type { Account, AccountInput } from "@/domain/accounts/types";
import type { AccountSlot, CustomerInput } from "@/domain/slots/types";
import { normalizeAccountPrefix } from "@/domain/accounts/numberPrefix";
import { normalizeOrderId } from "@/domain/slots/normalizeOrderId";

// ---------------------------------------------------------------------------
// Helpers
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

/**
 * Generate a per-game account number.
 * The prefix is already normalized — this function only appends the next sequence number.
 */
function generateAccountNumber(prefix: string, accounts: Account[]): string {
  const max = accounts.reduce((m, a) => {
    const match = a.number.match(/(\d+)$/);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `#${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Resolve the display prefix for a new or edited account.
 * – If the user supplied a non-blank prefix → normalize and use it.
 * – Otherwise → normalize the parent game title (never the technical gameId).
 */
function resolvePrefix(inputPrefix: string | undefined, gameTitle: string): string {
  const raw = inputPrefix?.trim();
  return normalizeAccountPrefix(raw && raw.length > 0 ? raw : gameTitle);
}

/**
 * Scan all accounts across all games and return the next unique accountCode.
 * Format: ACC-000001 … ACC-999999.
 * Safe to call inside setGames() with the previous-state snapshot.
 */
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

/** Generate a unique customer ID using the slot ID as a stable namespace. */
function generateCustomerId(slotId: string): string {
  return `${slotId}-cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Today's Jalali date as a simple YYYY/MM/DD string (uses JS date + rough conversion). */
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
  addGame: (data: { title: string; cover: string; platform: Platform; status: GameStatus }) => void;
  editGame: (id: string, data: { title: string; cover: string; platform: Platform; status: GameStatus }) => void;
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
  /** Add a customer assignment to a specific capacity (slot) inside an account. */
  addCapacityCustomer: (gameId: string, accountId: string, slotId: string, data: CustomerInput) => void;
  /** Edit an existing customer assignment. */
  editCapacityCustomer: (gameId: string, accountId: string, slotId: string, customerId: string, data: CustomerInput) => void;
  /** Remove a customer assignment. */
  removeCapacityCustomer: (gameId: string, accountId: string, slotId: string, customerId: string) => void;
}

interface GamesContextValue {
  games: Game[];
  mutations: GameMutations;
  accountMutations: AccountMutations;
  capacityMutations: CapacityMutations;
}

const GamesContext = createContext<GamesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>(initialGames);

  // -- Game mutations --------------------------------------------------------

  const addGame = useCallback<GameMutations["addGame"]>((data) => {
    const newGame: Game = {
      id: `game-${Date.now()}`,
      accounts: [],
      ...data,
    };
    setGames((prev) => [newGame, ...prev]);
  }, []);

  /**
   * Edit a game. If the platform changes, all account slots are regenerated
   * from the new platform — existing customer assignments inside those slots
   * will be lost (mock-phase limitation; safe for frontend-only state).
   */
  const editGame = useCallback<GameMutations["editGame"]>((id, data) => {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const platformChanged = g.platform !== data.platform;
        const updatedAccounts = platformChanged
          ? g.accounts.map((a) => ({
              ...a,
              slots: generateSlots(data.platform, a.id),
            }))
          : g.accounts;
        return { ...g, ...data, accounts: updatedAccounts };
      }),
    );
  }, []);

  const toggleGameStatus = useCallback<GameMutations["toggleGameStatus"]>((id) => {
    setGames((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, status: g.status === "active" ? "inactive" : "active" } : g,
      ),
    );
  }, []);

  const deleteGame = useCallback<GameMutations["deleteGame"]>((id) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // -- Account mutations -----------------------------------------------------

  const addAccount = useCallback<AccountMutations["addAccount"]>((gameId, data) => {
    setGames((prev) => {
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
      setGames((prev) =>
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
      setGames((prev) =>
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
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        return { ...g, accounts: g.accounts.filter((a) => a.id !== accountId) };
      }),
    );
  }, []);

  // -- Capacity (slot) customer mutations ------------------------------------

  const addCapacityCustomer = useCallback<CapacityMutations["addCapacityCustomer"]>(
    (gameId, accountId, slotId, data) => {
      setGames((prev) =>
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
      setGames((prev) =>
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
      setGames((prev) =>
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
        mutations: { addGame, editGame, toggleGameStatus, deleteGame },
        accountMutations: { addAccount, editAccount, toggleAccountStatus, deleteAccount },
        capacityMutations: { addCapacityCustomer, editCapacityCustomer, removeCapacityCustomer },
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
