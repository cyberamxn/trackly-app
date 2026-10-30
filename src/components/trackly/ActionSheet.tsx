"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Archive, Trash2, RotateCcw, X, Pencil } from "lucide-react";

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  archiveLabel?: string;
  restoreLabel?: string;
  deleteLabel?: string;
}

export function ActionSheet({
  open, onClose, title, subtitle,
  onEdit, onArchive, onRestore, onDelete,
  editLabel = "Edit",
  archiveLabel = "Archive",
  restoreLabel = "Restore",
  deleteLabel = "Delete Permanently",
}: ActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed sheet-bottom left-0 right-0 z-[70] rounded-t-[32px] bg-background sheet-safe-pb max-h-[60vh] overflow-y-auto no-scrollbar ios-scroll"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 pt-2 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[16px] font-bold">{title}</p>
                  {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {onEdit && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onEdit(); onClose(); }}
                    className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 flex items-center gap-3 px-4 text-[14px] font-medium"
                  >
                    <Pencil size={18} />
                    {editLabel}
                  </motion.button>
                )}

                {onArchive && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onArchive(); onClose(); }}
                    className="w-full h-12 rounded-xl bg-muted hover:bg-muted/70 flex items-center gap-3 px-4 text-[14px] font-medium"
                  >
                    <Archive size={18} className="text-muted-foreground" />
                    {archiveLabel}
                    <span className="text-[11px] text-muted-foreground ml-auto">Hides from main view, can restore later</span>
                  </motion.button>
                )}

                {onRestore && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onRestore(); onClose(); }}
                    className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 flex items-center gap-3 px-4 text-[14px] font-medium"
                  >
                    <RotateCcw size={18} />
                    {restoreLabel}
                  </motion.button>
                )}

                {onDelete && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onDelete(); onClose(); }}
                    className="w-full h-12 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/5 flex items-center gap-3 px-4 text-[14px] font-medium"
                  >
                    <Trash2 size={18} />
                    {deleteLabel}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

