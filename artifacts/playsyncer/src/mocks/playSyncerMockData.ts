import type { Account } from "@/domain/accounts/types";
import type { Game, Platform } from "@/domain/games/types";
import type { AccountSlot } from "@/domain/slots/types";

const slotsForPlatform = (platform: Platform, seed: number): AccountSlot[] => {
  if (platform === "PS4_ONLY") {
    return [
      {
        id: `s-${seed}-z2ps4-1`,
        type: "Z2_PS4_1",
        label: "Z2 PS4",
        customers: [
          {
            id: `c-${seed}-4`,
            phone: "09195545544",
            orderId: "ORD-10201",
            createdAt: "1403/09/02",
          },
        ],
      },
    ];
  }

  const base: AccountSlot[] = [
    {
      id: `s-${seed}-z2ps5-1`,
      type: "Z2_PS5_1",
      label: "Z2 PS5 #1",
      customers: [
        {
          id: `c-${seed}-1`,
          phone: "09121234521",
          orderId: "ORD-10248",
          createdAt: "1403/09/12",
        },
      ],
    },
    {
      id: `s-${seed}-z2ps5-2`,
      type: "Z2_PS5_2",
      label: "Z2 PS5 #2",
      customers: [
        {
          id: `c-${seed}-2`,
          phone: "09351239812",
          orderId: "ORD-10259",
          createdAt: "1403/09/15",
        },
        {
          id: `c-${seed}-3`,
          phone: "09011221122",
          orderId: "ORD-10263",
          note: "نیاز به پیگیری",
          createdAt: "1403/09/18",
        },
      ],
    },
    {
      id: `s-${seed}-z3ps5`,
      type: "Z3_PS5",
      label: "Z3 PS5",
      customers: [],
    },
  ];

  if (platform === "PS4_AND_PS5") {
    base.splice(2, 0, {
      id: `s-${seed}-z2ps4-1`,
      type: "Z2_PS4_1",
      label: "Z2 PS4",
      customers: [
        {
          id: `c-${seed}-4`,
          phone: "09195545544",
          orderId: "ORD-10201",
          createdAt: "1403/09/02",
        },
      ],
    });
  }

  return base;
};

/** Format a global account code from a 1-based sequential number. */
export const formatAccountCode = (n: number): string =>
  `ACC-${String(n).padStart(6, "0")}`;

/**
 * Generate mock accounts for one game.
 * @param gameId       The game's technical ID (used only for internal IDs, not display).
 * @param platform     The game platform.
 * @param count        Number of accounts to generate.
 * @param codeOffset   How many accountCodes have been assigned before this game's accounts.
 *                     Account at index i receives code codeOffset + i + 1.
 * @param numberPrefix Clean display prefix for account.number (e.g. "GTA6", "FC25").
 *                     Defaults to gameId.toUpperCase() when omitted.
 */
const makeAccounts = (
  gameId: string,
  platform: Platform,
  count: number,
  codeOffset: number,
  numberPrefix?: string,
): Account[] => {
  const prefix = numberPrefix ?? gameId.toUpperCase();

  return Array.from({ length: count }).map((_, index) => {
    const accountIndex = index + 1;
    const disabled = accountIndex % 7 === 0;

    return {
      id: `${gameId}-acc-${accountIndex}`,
      accountCode: formatAccountCode(codeOffset + accountIndex),
      numberPrefix: prefix,
      number: `#${prefix}-${String(accountIndex).padStart(3, "0")}`,
      email: `${gameId}.account${accountIndex}@playsyncer.io`,
      password: `Ps@${gameId}${accountIndex}${accountIndex}${accountIndex}!`,
      emailPassword: `Em@${gameId}${accountIndex}!`,
      onlineId: `PSN_${gameId}_${accountIndex}`,
      birthDate: "1990/01/15",
      familyManagementEmail: `family.${gameId}${accountIndex}@playsyncer.io`,
      backupCodes: ["a4f9-22", "b7c1-88", "e6d3-14", "9k22-ll"],
      status: disabled ? "disabled" : "active",
      slots: slotsForPlatform(platform, accountIndex),
    };
  });
};

// Account counts per game — must stay in sync with the games array below.
// gta6:6  ea-fc25:8  cod-bo6:5  spiderman2:4  gow-ragnarok:7  hogwarts:3  fifa14:3
// Total: 36 unique accountCodes → ACC-000001 … ACC-000036
export const games: Game[] = [
  {
    id: "gta6",
    title: "GTA VI",
    cover: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&auto=format&fit=crop",
    platform: "PS5_ONLY",
    status: "active",
    accounts: makeAccounts("gta6", "PS5_ONLY", 6, 0, "GTA6"),          // ACC-000001..006
  },
  {
    id: "ea-fc25",
    title: "EA Sports FC 25",
    cover: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop",
    platform: "PS4_AND_PS5",
    status: "active",
    accounts: makeAccounts("ea-fc25", "PS4_AND_PS5", 8, 6, "FC25"),    // ACC-000007..014
  },
  {
    id: "cod-bo6",
    title: "Call of Duty: Black Ops 6",
    cover: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&auto=format&fit=crop&sat=-50",
    platform: "PS4_AND_PS5",
    status: "active",
    accounts: makeAccounts("cod-bo6", "PS4_AND_PS5", 5, 14, "COD-BO6"), // ACC-000015..019
  },
  {
    id: "spiderman2",
    title: "Marvel's Spider-Man 2",
    cover: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop",
    platform: "PS5_ONLY",
    status: "active",
    accounts: makeAccounts("spiderman2", "PS5_ONLY", 4, 19, "SM2"),    // ACC-000020..023
  },
  {
    id: "gow-ragnarok",
    title: "God of War: Ragnarök",
    cover: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop",
    platform: "PS4_AND_PS5",
    status: "inactive",
    accounts: makeAccounts("gow-ragnarok", "PS4_AND_PS5", 7, 23, "GOW"), // ACC-000024..030
  },
  {
    id: "hogwarts",
    title: "Hogwarts Legacy",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop",
    platform: "PS4_AND_PS5",
    status: "active",
    accounts: makeAccounts("hogwarts", "PS4_AND_PS5", 3, 30, "HWTS"),  // ACC-000031..033
  },
  {
    id: "fifa14",
    title: "FIFA 14",
    cover: "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=800&auto=format&fit=crop",
    platform: "PS4_ONLY",
    status: "active",
    accounts: makeAccounts("fifa14", "PS4_ONLY", 3, 33, "FIFA14"),     // ACC-000034..036
  },
];
