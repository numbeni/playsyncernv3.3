import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Pencil, PowerOff, Trash2 } from "lucide-react";
import type { Game } from "@/domain/games/types";
import { platformLabel } from "@/domain/games/platform";
import { getGameStats } from "@/domain/games/stats";
import { can } from "@/domain/permissions/permissions";
import { cn } from "@/lib/utils";

interface Props {
  game: Game;
  onEdit?: (game: Game) => void;
  onDisable?: (game: Game) => void;
  onDelete?: (game: Game) => void;
}

export function GameCard({ game, onEdit, onDisable, onDelete }: Props) {
  const stats = getGameStats(game);
  const isPs5Only = game.platform === "PS5_ONLY";
  const isActive = game.status === "ACTIVE";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:shadow-elevated hover:-translate-y-0.5",
        isActive ? "border-border hover:border-primary/50" : "border-border/60 opacity-75",
      )}
    >
      {/* Cover image — clickable, navigates to game detail */}
      <Link to={`/games/${game.id}`} className="relative aspect-[16/10] overflow-hidden bg-muted block">
        <img
          src={game.coverUrl}
          alt={game.title}
          loading="lazy"
          className={cn(
            "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
            !isActive && "grayscale-[40%]",
          )}
        />

        {/* Platform badge — top-right */}
        <div className="absolute top-3 right-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md border",
              isPs5Only
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-card/80 text-foreground border-border",
            )}
          >
            <Gamepad2 className="h-3 w-3" />
            {platformLabel(game.platform)}
          </span>
        </div>

        {/* Status badge — top-left */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md border",
              isActive
                ? "bg-success/20 text-success border-success/40"
                : "bg-muted/80 text-muted-foreground border-border",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isActive ? "bg-success animate-pulse" : "bg-muted-foreground",
              )}
            />
            {isActive ? "فعال" : "غیرفعال"}
          </span>
        </div>
      </Link>

      {/* Game title — below image, always readable */}
      <div className="px-4 pt-3 pb-1">
        <h3 className="truncate text-base font-bold">{game.title}</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-border">
        <Stat label="اکانت‌ها" value={stats.totalAccounts} />
        <Stat label="فعال" value={stats.activeAccounts} tone="success" />
        <Stat label="ظرفیت‌ها" value={stats.totalSlots} />
        <Stat label="تخصیص" value={stats.totalAssignments} tone="primary" />
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 p-4">
        {/* Primary navigation */}
        <Link
          to={`/games/${game.id}`}
          className="group/btn flex flex-1 items-center justify-between rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-glow"
        >
          <span>اکانت‌ها</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Link>

        {/* Edit */}
        {can("game.edit") && onEdit && (
          <button
            onClick={() => onEdit(game)}
            title="ویرایش بازی"
            aria-label="ویرایش بازی"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition-all hover:border-primary/50 hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        {/* Disable / Enable toggle */}
        {can("game.disable") && onDisable && (
          <button
            onClick={() => onDisable(game)}
            title={isActive ? "غیرفعال‌سازی بازی" : "فعال‌سازی بازی"}
            aria-label={isActive ? "غیرفعال‌سازی بازی" : "فعال‌سازی بازی"}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-soft transition-all",
              isActive
                ? "border-border bg-card text-muted-foreground hover:border-warning/50 hover:bg-warning/10 hover:text-warning"
                : "border-success/40 bg-success/10 text-success hover:border-success hover:bg-success/20",
            )}
          >
            <PowerOff className="h-4 w-4" />
          </button>
        )}

        {/* Delete */}
        {can("game.delete") && onDelete && (
          <button
            onClick={() => onDelete(game)}
            title="حذف بازی"
            aria-label="حذف بازی"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-soft transition-all hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success";
}) {
  return (
    <div className="min-w-0 text-center">
      <div
        className={cn(
          "text-lg font-bold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "success" && "text-success",
        )}
      >
        {value.toLocaleString("fa-IR")}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
