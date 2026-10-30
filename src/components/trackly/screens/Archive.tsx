"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Archive, RotateCcw, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { Card, ScreenHeader, EmptyState } from "../ui";
import { ActionSheet } from "../ActionSheet";
import { CategoryIcon } from "../CategoryIcon";
import { formatINR } from "@/lib/trackly/data";

export function ArchiveScreen() {
  const { setScreen } = useTracklyStore();
  const archivedExpenses = useAppData((s) => s.archivedExpenses);
  const archivedIncomes = useAppData((s) => s.archivedIncomes);
  const archivedShopping = useAppData((s) => s.archivedShopping);
  const archivedBorrowLend = useAppData((s) => s.archivedBorrowLend);
  const restoreExpense = useAppData((s) => s.restoreExpense);
  const restoreIncome = useAppData((s) => s.restoreIncome);
  const restoreShopping = useAppData((s) => s.restoreShopping);
  const restoreBorrowLend = useAppData((s) => s.restoreBorrowLend);
  const permanentDeleteExpense = useAppData((s) => s.permanentDeleteExpense);
  const permanentDeleteIncome = useAppData((s) => s.permanentDeleteIncome);
  const permanentDeleteShopping = useAppData((s) => s.permanentDeleteShopping);
  const permanentDeleteBorrowLend = useAppData((s) => s.permanentDeleteBorrowLend);
  const clearAllArchived = useAppData((s) => s.clearAllArchived);

  const [actionTarget, setActionTarget] = useState<{ id: string; type: string; title: string; subtitle: string } | null>(null);

  const totalArchived = archivedExpenses.length + archivedIncomes.length + archivedShopping.length + archivedBorrowLend.length;

  const handleRestore = () => {
    if (!actionTarget) return;
    const { id, type } = actionTarget;
    if (type === "expense") { restoreExpense(id); toast.success("Expense restored"); }
    else if (type === "income") { restoreIncome(id); toast.success("Income restored"); }
    else if (type === "shopping") { restoreShopping(id); toast.success("Item restored"); }
    else if (type === "borrowLend") { restoreBorrowLend(id); toast.success("Entry restored"); }
  };

  const handlePermanentDelete = () => {
    if (!actionTarget) return;
    const { id, type } = actionTarget;
    if (type === "expense") permanentDeleteExpense(id);
    else if (type === "income") permanentDeleteIncome(id);
    else if (type === "shopping") permanentDeleteShopping(id);
    else if (type === "borrowLend") permanentDeleteBorrowLend(id);
    toast.success("Permanently deleted");
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Archive"
        subtitle={totalArchived > 0 ? `${totalArchived} archived items` : "No archived items"}
        onBack={() => setScreen("settings")}
        right={
          totalArchived > 0 ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (confirm("Permanently delete ALL archived items? This cannot be undone.")) {
                  clearAllArchived();
                  toast.success("All archived items deleted");
                }
              }}
              className="px-3 h-9 rounded-full bg-muted flex items-center text-[12px] font-medium text-red-500"
            >
              Clear All
            </motion.button>
          ) : undefined
        }
      />

      {totalArchived === 0 ? (
        <div className="px-5 mt-6">
          <EmptyState
            icon={<Archive size={24} className="text-muted-foreground" />}
            title="Nothing in archive"
            description="Long-press any transaction in Expenses to archive it. Archived items can be restored anytime."
          />
        </div>
      ) : (
        <div className="px-5 mt-2 space-y-4">
          {/* Archived Expenses */}
          {archivedExpenses.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expenses ({archivedExpenses.length})</p>
              <Card className="p-0 overflow-hidden">
                {archivedExpenses.map((e, i) => (
                  <ArchivedRow
                    key={e.id}
                    title={e.title}
                    subtitle={`${formatINR(e.amount)} · ${e.category} · ${new Date(e.archivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                    icon={<CategoryIcon name={e.category} size={16} />}
                    onClick={() => setActionTarget({ id: e.id, type: "expense", title: e.title, subtitle: formatINR(e.amount) })}
                    last={i === archivedExpenses.length - 1}
                  />
                ))}
              </Card>
            </div>
          )}

          {/* Archived Incomes */}
          {archivedIncomes.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Incomes ({archivedIncomes.length})</p>
              <Card className="p-0 overflow-hidden">
                {archivedIncomes.map((e, i) => (
                  <ArchivedRow
                    key={e.id}
                    title={e.source}
                    subtitle={`${formatINR(e.amount)} · ${new Date(e.archivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                    icon={<span className="text-[14px]">+</span>}
                    onClick={() => setActionTarget({ id: e.id, type: "income", title: e.source, subtitle: formatINR(e.amount) })}
                    last={i === archivedIncomes.length - 1}
                  />
                ))}
              </Card>
            </div>
          )}

          {/* Archived Shopping */}
          {archivedShopping.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Shopping ({archivedShopping.length})</p>
              <Card className="p-0 overflow-hidden">
                {archivedShopping.map((e, i) => (
                  <ArchivedRow
                    key={e.id}
                    title={e.name}
                    subtitle={`${formatINR(e.price)} · ${e.status} · ${new Date(e.archivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                    icon={<span className="text-[14px]">🛒</span>}
                    onClick={() => setActionTarget({ id: e.id, type: "shopping", title: e.name, subtitle: formatINR(e.price) })}
                    last={i === archivedShopping.length - 1}
                  />
                ))}
              </Card>
            </div>
          )}

          {/* Archived Borrow/Lend */}
          {archivedBorrowLend.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Borrow/Lend ({archivedBorrowLend.length})</p>
              <Card className="p-0 overflow-hidden">
                {archivedBorrowLend.map((e, i) => (
                  <ArchivedRow
                    key={e.id}
                    title={e.person}
                    subtitle={`${e.type} · ${formatINR(e.amount)} · ${new Date(e.archivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                    icon={<span className="text-[14px]">💰</span>}
                    onClick={() => setActionTarget({ id: e.id, type: "borrowLend", title: e.person, subtitle: formatINR(e.amount) })}
                    last={i === archivedBorrowLend.length - 1}
                  />
                ))}
              </Card>
            </div>
          )}
        </div>
      )}

      <ActionSheet
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.title || "Item"}
        subtitle={actionTarget?.subtitle}
        onRestore={handleRestore}
        onDelete={handlePermanentDelete}
        restoreLabel="Restore to main view"
        deleteLabel="Delete permanently"
      />
    </div>
  );
}

function ArchivedRow({ title, subtitle, icon, onClick, last }: { title: string; subtitle: string; icon: React.ReactNode; onClick: () => void; last?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${last ? "" : "border-b border-border"}`}
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      <RotateCcw size={14} className="text-muted-foreground shrink-0" />
    </motion.button>
  );
}
