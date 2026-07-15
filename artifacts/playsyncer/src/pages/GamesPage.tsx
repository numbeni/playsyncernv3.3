import { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { SmartSearch } from "@/components/SmartSearch";
import { GameCard } from "@/components/GameCard";
import { useGames } from "@/hooks/useGames";

export default function GamesPage() {
  const { games, isLoading, isError, error, refetch } = useGames();
  const [query, setQuery] = useState("");

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
        acc.games += 1;
        acc.accounts += g.accountCount;
        return acc;
      },
      { games: 0, accounts: 0 },
    );
  }, [games]);

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
      </header>

      {/* SmartSearch — top of content, above stats */}
      <section className="mt-6">
        <SmartSearch onGameFilter={setQuery} games={games} />
      </section>

      {/* Overview stats — only backend-backed metrics in Stage B. */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <OverviewStat label="کل بازی‌ها" value={totals.games} accent="primary" />
        <OverviewStat label="کل اکانت‌ها" value={totals.accounts} />
      </section>

      {/* Game grid */}
      <section className="mt-8">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState hasQuery={Boolean(query)} query={query} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>
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

function LoadingState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">در حال دریافت بازی‌ها…</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
      <p className="mt-3 text-sm font-medium text-destructive">دریافت بازی‌ها با خطا مواجه شد</p>
      {error && <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>}
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        تلاش مجدد
      </button>
    </div>
  );
}

function EmptyState({ hasQuery, query }: { hasQuery: boolean; query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">
        {hasQuery
          ? `بازی‌ای با «${query}» پیدا نشد.`
          : "هیچ بازی‌ای وجود ندارد. اولین بازی در مرحله بعدی (C) اضافه خواهد شد."}
      </p>
    </div>
  );
}
