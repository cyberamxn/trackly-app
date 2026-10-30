"use client";

import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTracklyStore } from "@/lib/trackly/store";

/**
 * Quick Add Floating Action Button.
 * Positioned bottom-right above the tab bar (iOS-style FAB).
 * Tapping opens the Quick Add sheet.
 */
export function QuickAddFab() {
  const { openQuickAdd, quickAddOpen } = useTracklyStore();

  return (
    <AnimatePresence>
      {/* Hide the FAB while the Quick Add sheet is open */}
      {!quickAddOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          onClick={openQuickAdd}
          aria-label="Quick Add"
          data-tour="quick-add"
          className="absolute bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-float"
        >
          <Plus size={26} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
