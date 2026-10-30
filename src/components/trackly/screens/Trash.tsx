"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trash2, RotateCcw, Inbox, ArrowDownLeft, Flame, CheckCircle2,
  StickyNote, ShoppingBag, HandCoins,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import {
  useTrashStore, countByType, totalTrashCount, relativeDeletedAt,
  type TrashItem, type TrashType,
} from "@/lib/trackly/trash";
import { restoreTaskToRoutine } from "@/lib/trackly/routine";
import { Card, ScreenHeader, EmptyState } from "../ui";
import { ActionSheet } from "../ActionSheet";
import { CategoryIcon } from "../CategoryIcon";
import { formatINR } from "@/lib/trackly/data";

export function TrashScreen() {
  const { setScreen } = useTracklyStore();
  const items = useTrashStore((s) => s.items);
  const restoreItem = useTrashStore((s) => s.restoreItem);
  const permanentRemove = useTrashStore((s) => s.permanentRemove);
  const emptyTrash = useTrashStore((s) => s.emptyTrash);

  const [actionTarget, setActionTarget] = useState<TrashItem | null>(null);

  const total = totalTrashCount(items);
  const groups = countByType(items);

  const handleRestore = (item: TrashItem) => {
    // 1. Remove from trash first (returns the full item)
    const restored = restoreItem(item.trashId);
    if (!restored) return;

    // 2. Re-insert into the correct store with FULL fidelity
    //    (direct setState keeps original id / streak / history / notes)
    switch (restored.type) {
      case "expense":
        useAppData.setState((s) => ({ expenses: [restored.data, ...s.expenses] }));
        break;
      case "income":
        useAppData.setState((s) => ({ incomes: [restored.data, ...s.incomes] }));
        break;
      case "habit":
        useAppData.setState((s) => ({ habits: [restored.data, ...s.habits] }));
        break;
      case "note":
        useAppData.setState((s) => ({ notes: [restored.data, ...s.notes] }));
        break;
      case "shopping":
        useAppData.setState((s) => ({ shopping: [restored.data, ...s.shopping] }));
        break;
      case "borrow":
        useAppData.setState((s) => ({ borrowLend: [restored.data, ...s.borrowLend] }));
        break;
      case "task":
        restoreTaskToRoutine(restored.meta?.routineId ?? "", restored.data);
        break;
    }
    toast.success(`"${restored.title}" restored`);
  };

  const handlePermanentDelete = (item: TrashItem) => {
    permanentRemove(item.trashId);
    toast.success("Deleted permanently");
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Deleted Items"
        subtitle={total > 0 ? `${total} deleted ${total === 1 ? "item" : "items"} · counted by type` : "Nothing deleted yet"}
        onBack={() => setScreen("settings")}
        right={
          total > 0 ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (confirm(`Permanently delete ALL ${total} items? This cannot be undone.`)) {
                  emptyTrash();
                  toast.success("Deleted folder emptied");
                }
              }}
              className="px-3 h-9 rounded-full bg-muted flex items-center text-[12px] font-medium text-red-500"
            >
              Empty All
            </motion.button>
          ) : undefined
        }
      />

      {total === 0 ? (
        <div className="px-5 mt-6">
          <EmptyState
            icon={<Trash2 size={24} className="text-muted-foreground" />}
            title="Delete folder is empty"
            description="Whenever you delete a transaction, habit, task or note it lands here — counted by type, and restorable anytime."
          />
        </div>
      ) : (
        <div className="px-5 mt-2 space-y-4">
          {/* Count summary chips */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-full bg-foreground text-background text-[12px] font-semibold">
              All · {total}
            </span>
            {groups.map((g) => (
              <span
                key={g.type}
                className="px-3 py-1.5 rounded-full bg-muted text-[12px] font-medium text-muted-foreground"
              >
                {g.label} · {g.count}
              </span>
            ))}
          </div>

          {/* Grouped lists */}
          {groups.map((g) => {
            const groupItems = items.filter((t) => t.type === g.type);
            return (
              <div key={g.type}>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  {g.label} ({g.count})
                </p>
                <Card className="p-0 overflow-hidden">
                  {groupItems.map((t, i) => (
                    <DeletedRow
                      key={t.trashId}
                      item={t}
                      last={i === groupItems.length - 1}
                      onClick={() => setActionTarget(t)}
                    />
                  ))}
                </Card>
              </div>
            );
          })}

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Items stay here until you restore or permanently delete them.
          </p>
        </div>
      )}

      <ActionSheet
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.title || "Item"}
        subtitle={actionTarget ? `${actionTarget.subtitle} · ${relativeDeletedAt(actionTarget.deletedAt)}` : ""}
        onRestore={() => {
          if (actionTarget) handleRestore(actionTarget);
        }}
        onDelete={() => {
          if (actionTarget) handlePermanentDelete(actionTarget);
        }}
        restoreLabel="Restore to app"
        deleteLabel="Delete permanently"
      />
    </div>
  );
}

function typeIcon(item: TrashItem, size = 16) {
  switch (item.type) {
    case "expense":
      return <CategoryIcon name={item.icon || "others"} size={size} />;
    case "income":
      return <ArrowDownLeft size={size} />;
    case "habit":
      return <Flame size={size} />;
    case "task":
      return <CheckCircle2 size={size} />;
    case "note":
      return <StickyNote size={size} />;
    case "shopping":
      return <ShoppingBag size={size} />;
    case "borrow":
      return <HandCoins size={size} />;
    default:
      return <Inbox size={size} />;
  }
}

function amountText(item: TrashItem): string | null {
  const d = item.data;
  if (item.type === "expense" || item.type === "income") return formatINR(d?.amount ?? 0);
  if (item.type === "shopping") return formatINR(d?.price ?? 0);
  if (item.type === "borrow") return formatINR(d?.amount ?? 0);
  return null;
}

function DeletedRow({ item, last, onClick }: { item: TrashItem; last: boolean; onClick: () => void }) {
  const amt = amountText(item);
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${last ? "" : "border-b border-border"}`}
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        {typeIcon(item)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate">{item.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {item.subtitle} · {relativeDeletedAt(item.deletedAt)}
        </p>
      </div>
      {amt && <p className="text-[13px] font-semibold tabular-nums shrink-0">{amt}</p>}
      <RotateCcw size={14} className="text-muted-foreground shrink-0" />
    </motion.button>
  );
}
