import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { SmartSearch } from "@/components/SmartSearch";
import { GameCard } from "@/components/GameCard";
import { GameFormModal, type GameFormData } from "@/components/GameFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getGameStats } from "@/domain/games/stats";
import { can } from "@/domain/permissions/permissions";
import { useGames } from "@/hooks/useGames";
import type { Game } from "@/domain/games/types";

type DialogState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; game: Game }
  | { kind: "disable"; game: Game }
  | { kind: "delete"; game: Game };

export default function GamesPage() {
  const { games, mutations } = useGames();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  useEffect(() => {
    document.title = "بازی‌ها — PlaySyncer";
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) => g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q),
    );
  }, [query, games]);

  const totals = useMemo(() => {
    return games.reduce(
      (acc, g) => {
        const s = getGameStats(g);
        acc.games += 1;
        acc.accounts += s.totalAccounts;
        acc.slots += s.totalSlots;
        acc.assignments += s.totalAssignments;
        return acc;
      },
      { games: 0, accounts: 0, slots: 0, assignments: 0 },
    );
  }, [games]);

  // --- Handlers ---

  const handleAdd = useCallback(
    (data: GameFormData) => {
      mutations.addGame(data);
      setDialog({ kind: "none" });
    },
    [mutations],
  );

  const handleEdit = useCallback(
    (data: GameFormData) => {
      if (dialog.kind !== "edit") return;
      mutations.editGame(dialog.game.id, data);
      setDialog({ kind: "none" });
    },
    [dialog, mutations],
  );

  const handleToggleDisable = useCallback(() => {
    if (dialog.kind !== "disable") return;
    mutations.toggleGameStatus(dialog.game.id);
    setDialog({ kind: "none" });
  }, [dialog, mutations]);

  const handleDelete = useCallback(() => {
    if (dialog.kind !== "delete") return;
    mutations.deleteGame(dialog.game.id);
    setDialog({ kind: "none" });
  }, [dialog, mutations]);

  const disableGame = dialog.kind === "disable" ? dialog.game : null;
  const isCurrentlyActive = disableGame?.status === "active";
  const deleteGame = dialog.kind === "delete" ? dialog.game : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">داشبورد</div>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            بازی‌ها
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مدیریت بازی‌ها و اکانت‌های PlayStation
          </p>
        </div>

        {can("game.create") && (
          <button
            onClick={() => setDialog({ kind: "add" })}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-shadow hover:shadow-glow sm:px-4"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">افزودن بازی</span>
          </button>
        )}
      </header>

      {/* SmartSearch — top of content, above stats */}
      <section className="mt-6">
        <SmartSearch onGameFilter={setQuery} games={games} />
      </section>

      {/* Overview stats */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewStat label="کل بازی‌ها" value={totals.games} accent="primary" />
        <OverviewStat label="کل اکانت‌ها" value={totals.accounts} />
        <OverviewStat label="کل ظرفیت‌ها" value={totals.slots} />
        <OverviewStat label="کل تخصیص‌ها" value={totals.assignments} accent="success" />
      </section>

      {/* Game grid */}
      <section className="mt-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {query
                ? `بازی‌ای با «${query}» پیدا نشد.`
                : "هیچ بازی‌ای وجود ندارد. اولین بازی را اضافه کنید."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                onEdit={(game) => setDialog({ kind: "edit", game })}
                onDisable={(game) => setDialog({ kind: "disable", game })}
                onDelete={(game) => setDialog({ kind: "delete", game })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Add Game modal */}
      <GameFormModal
        open={dialog.kind === "add"}
        mode="add"
        onSave={handleAdd}
        onClose={() => setDialog({ kind: "none" })}
      />

      {/* Edit Game modal */}
      <GameFormModal
        open={dialog.kind === "edit"}
        mode="edit"
        initial={dialog.kind === "edit" ? dialog.game : undefined}
        onSave={handleEdit}
        onClose={() => setDialog({ kind: "none" })}
      />

      {/* Disable / Enable confirmation */}
      <ConfirmDialog
        open={dialog.kind === "disable"}
        title={isCurrentlyActive ? "غیرفعال‌سازی بازی" : "فعال‌سازی بازی"}
        description={
          isCurrentlyActive
            ? `آیا مطمئنید که می‌خواهید «${disableGame?.title}» را غیرفعال کنید؟ اکانت‌ها دست‌نخورده می‌مانند.`
            : `آیا می‌خواهید «${disableGame?.title}» را دوباره فعال کنید؟`
        }
        confirmLabel={isCurrentlyActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
        confirmVariant="warning"
        onConfirm={handleToggleDisable}
        onCancel={() => setDialog({ kind: "none" })}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={dialog.kind === "delete"}
        title="حذف بازی"
        description={`آیا از حذف «${deleteGame?.title}» مطمئنید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف دائمی"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDialog({ kind: "none" })}
      />
    </div>
  );
}

function OverviewStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "success";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1.5 text-2xl font-bold tabular-nums " +
          (accent === "primary"
            ? "text-primary"
            : accent === "success"
              ? "text-success"
              : "text-foreground")
        }
      >
        {value.toLocaleString("fa-IR")}
      </div>
    </div>
  );
}
