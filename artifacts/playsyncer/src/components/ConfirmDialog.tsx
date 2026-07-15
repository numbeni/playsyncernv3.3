import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأیید",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  // Lock body scroll; overlay itself is scrollable
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    /* Scrollable overlay — same pattern as GameFormModal */
    <div
      className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop — fixed so it doesn't scroll */}
      <div
        className="fixed inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Centering wrapper — single source of padding so the math matches max-h.
          min-h-full + my-auto centers short panels; tall panels start at the top
          and the wrapper scrolls so nothing is ever clipped. */}
      <div className="flex min-h-full justify-center p-4 sm:p-6">
        {/* Panel — max-h safety clamp so nothing is ever clipped */}
        <div className="relative z-10 my-auto w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-elevated animate-slide-up max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                confirmVariant === "danger"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-warning/15 text-warning",
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="confirm-title" className="text-base font-semibold leading-tight">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all",
                confirmVariant === "danger"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-warning hover:bg-warning/90",
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
