import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Gamepad2, ChevronsUpDown } from "lucide-react";
import { SmartSearch } from "@/components/SmartSearch";
import { AccountCard } from "@/components/AccountCard";
import { AccountFormModal } from "@/components/AccountFormModal";
import { AccountDetailsModal } from "@/components/AccountDetailsModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Account, AccountInput } from "@/domain/accounts/types";
import { platformLabel } from "@/domain/games/platform";
import { getGameStats } from "@/domain/games/stats";
import { useGames } from "@/hooks/useGames";
import { can } from "@/domain/permissions/permissions";
import NotFoundPage from "./NotFoundPage";

export default function GameDetailPage() {
  const { gameId } = useParams();
  const [search] = useSearchParams();
  const highlight = search.get("highlight") ?? undefined;

  const { games, accountMutations, capacityMutations } = useGames();
  const game = games.find((g) => g.id === gameId);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  // Expand / Collapse All signal — new object reference each click forces cards to sync
  const [expandSignal, setExpandSignal] = useState<{ open: boolean; rev: number } | null>(null);

  useEffect(() => {
    document.title = game ? `${game.title} — PlaySyncer` : "بازی — PlaySyncer";
  }, [game]);

  if (!game) return <NotFoundPage />;

  const stats = getGameStats(game);

  const handleAddSave = (data: AccountInput) => {
    accountMutations.addAccount(game.id, data);
    setAddOpen(false);
  };

  const handleEditSave = (data: AccountInput) => {
    if (!editingAccount) return;
    accountMutations.editAccount(game.id, editingAccount.id, data);
    setEditingAccount(null);
  };

  const handleDelete = () => {
    if (!deleteAccountId) return;
    accountMutations.deleteAccount(game.id, deleteAccountId);
    setDeleteAccountId(null);
  };

  const handleExpandAll = () =>
    setExpandSignal((prev) => ({ open: true, rev: (prev?.rev ?? 0) + 1 }));
  const handleCollapseAll = () =>
    setExpandSignal((prev) => ({ open: false, rev: (prev?.rev ?? 0) + 1 }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          بازی‌ها
        </Link>
        <ChevronLeft className="h-3 w-3 shrink-0" />
        <span className="text-foreground">{game.title}</span>
      </div>

      {/* SmartSearch — top of account workspace, searches across all games */}
      <div className="mb-6">
        <SmartSearch games={games} />
      </div>

      <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className="relative aspect-[16/10] md:aspect-auto md:h-full bg-muted">
            <img
              src={game.cover}
              alt={game.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-card via-card/20 to-transparent md:from-card md:via-card/40" />
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Gamepad2 className="h-3 w-3" />
                    {platformLabel(game.platform)}
                  </span>
                  {game.status === "inactive" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      غیرفعال
                    </span>
                  )}
                </div>
                <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                  {game.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  مدیریت اکانت‌ها، ظرفیت‌ها و تخصیص مشتریان
                </p>
              </div>
              {can("account.create") && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-shadow hover:shadow-glow sm:px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">افزودن اکانت</span>
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeaderStat label="کل اکانت‌ها" value={stats.totalAccounts} />
              <HeaderStat label="اکانت‌های فعال" value={stats.activeAccounts} tone="success" />
              <HeaderStat label="کل ظرفیت‌ها" value={stats.totalSlots} />
              <HeaderStat label="کل تخصیص‌ها" value={stats.totalAssignments} tone="primary" />
            </div>
          </div>
        </div>
      </header>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">
            اکانت‌ها
            <span className="mr-2 text-sm font-medium text-muted-foreground">
              ({game.accounts.length.toLocaleString("fa-IR")})
            </span>
          </h2>

          {game.accounts.length > 0 && (
            <button
              onClick={expandSignal?.open ? handleCollapseAll : handleExpandAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-soft transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {expandSignal?.open ? "بستن همه" : "باز کردن همه"}
            </button>
          )}
        </div>

        {game.accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              هنوز اکانتی برای این بازی اضافه نشده است.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {game.accounts.map((acc: Account) => (
              <AccountCard
                key={acc.id}
                account={acc}
                platform={game.platform}
                gameTitle={game.title}
                highlighted={highlight === acc.id}
                expandSignal={expandSignal}
                onEdit={setEditingAccount}
                onViewDetails={setViewingAccount}
                onToggleStatus={(id) => accountMutations.toggleAccountStatus(game.id, id)}
                onDelete={setDeleteAccountId}
                onAddCapacityCustomer={(slotId, data) =>
                  capacityMutations.addCapacityCustomer(game.id, acc.id, slotId, data)
                }
                onEditCapacityCustomer={(slotId, customerId, data) =>
                  capacityMutations.editCapacityCustomer(game.id, acc.id, slotId, customerId, data)
                }
                onRemoveCapacityCustomer={(slotId, customerId) =>
                  capacityMutations.removeCapacityCustomer(game.id, acc.id, slotId, customerId)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Add Account Modal */}
      <AccountFormModal
        open={addOpen}
        mode="add"
        existingAccounts={game.accounts}
        gameTitle={game.title}
        onSave={handleAddSave}
        onClose={() => setAddOpen(false)}
      />

      {/* Edit Account Modal */}
      <AccountFormModal
        open={editingAccount !== null}
        mode="edit"
        existingAccounts={game.accounts}
        gameTitle={game.title}
        initial={editingAccount ?? undefined}
        onSave={handleEditSave}
        onClose={() => setEditingAccount(null)}
      />

      {/* View Details Modal */}
      <AccountDetailsModal
        open={viewingAccount !== null}
        account={viewingAccount}
        gamePlatform={game.platform}
        onClose={() => setViewingAccount(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteAccountId !== null}
        title="حذف اکانت"
        description="آیا مطمئن هستید؟ این اکانت، تمام ظرفیت‌ها و تخصیص‌های مرتبط به طور کامل حذف خواهند شد. این عمل قابل بازگشت نیست."
        confirmLabel="بله، حذف شود"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteAccountId(null)}
      />
    </div>
  );
}

function HeaderStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 text-xl font-bold tabular-nums " +
          (tone === "primary"
            ? "text-primary"
            : tone === "success"
              ? "text-success"
              : "text-foreground")
        }
      >
        {value.toLocaleString("fa-IR")}
      </div>
    </div>
  );
}
