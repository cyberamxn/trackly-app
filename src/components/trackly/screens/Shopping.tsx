"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ShoppingBag, Clock, Heart, Check, RotateCcw, Shield, Camera,
  Trash2, X, Wallet,
} from "lucide-react";
import { useTracklyStore } from "@/lib/trackly/store";
import { useAppData } from "@/lib/trackly/appData";
import { useTrashStore } from "@/lib/trackly/trash";
import { Card, SegmentedControl, ScreenHeader, ProgressBar, EmptyState } from "../ui";
import { formatINR } from "@/lib/trackly/data";
import { toast } from "sonner";

type Tab = "pending" | "purchased" | "wishlist";

export function Shopping() {
  const { setScreen } = useTracklyStore();
  const [tab, setTab] = useState<Tab>("pending");
  const items = useAppData((s) => s.shopping);
  const markPurchased = useAppData((s) => s.markShoppingPurchased);
  const moveToWishlist = useAppData((s) => s.moveShoppingToWishlist);
  const deleteShopping = useAppData((s) => s.deleteShopping);
  const addToTrash = useTrashStore((s) => s.addToTrash);
  const addShopping = useAppData((s) => s.addShopping);

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addStore, setAddStore] = useState("");

  const filtered = items.filter((s) => s.status === tab);
  const purchasedItems = items.filter((s) => s.status === "purchased");
  const pendingItems = items.filter((s) => s.status === "pending");
  const wishlistItems = items.filter((s) => s.status === "wishlist");
  const totalSpent = purchasedItems.reduce((s, i) => s + i.price, 0);
  const totalPending = pendingItems.reduce((s, i) => s + i.price, 0);
  const totalWishlist = wishlistItems.reduce((s, i) => s + i.price, 0);

  const handleAdd = () => {
    if (!addName.trim() || !addPrice) {
      toast.error("Name and price are required");
      return;
    }
    addShopping({
      name: addName.trim(),
      store: addStore.trim() || "Quick Add",
      price: parseInt(addPrice),
      status: "pending",
    });
    toast.success("Item added to shopping list");
    setAddName("");
    setAddPrice("");
    setAddStore("");
    setShowAdd(false);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Shopping"
        subtitle={`${formatINR(totalSpent)} spent · ${purchasedItems.length} purchased`}
        onBack={() => setScreen("dashboard")}
        right={
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)} className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center">
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        }
      />

      {/* Stats hero */}
      <div className="px-5 mt-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-foreground text-background p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-background/15 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Total Spent (Purchased)</p>
              <p className="text-[26px] font-bold tracking-tight text-display">{formatINR(totalSpent)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-background/15">
            <div className="text-center">
              <p className="text-[16px] font-bold">{pendingItems.length}</p>
              <p className="text-[10px] opacity-70 uppercase tracking-wider">Pending</p>
            </div>
            <div className="text-center border-x border-background/15">
              <p className="text-[16px] font-bold">{purchasedItems.length}</p>
              <p className="text-[10px] opacity-70 uppercase tracking-wider">Purchased</p>
            </div>
            <div className="text-center">
              <p className="text-[16px] font-bold">{wishlistItems.length}</p>
              <p className="text-[10px] opacity-70 uppercase tracking-wider">Wishlist</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pending/Wishlist totals */}
      {tab === "pending" && totalPending > 0 && (
        <div className="px-5 mt-3">
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground font-medium">Pending total</p>
              <p className="text-[16px] font-bold tabular-nums">{formatINR(totalPending)}</p>
            </div>
          </Card>
        </div>
      )}
      {tab === "wishlist" && totalWishlist > 0 && (
        <div className="px-5 mt-3">
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground font-medium">Wishlist total</p>
              <p className="text-[16px] font-bold tabular-nums">{formatINR(totalWishlist)}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 mt-3">
        <SegmentedControl
          options={[
            { label: `Pending (${pendingItems.length})`, value: "pending" },
            { label: `Purchased (${purchasedItems.length})`, value: "purchased" },
            { label: `Wishlist (${wishlistItems.length})`, value: "wishlist" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* Items list */}
      <div className="px-5 mt-3 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={20} className="text-muted-foreground" />}
            title={`No ${tab} items`}
            description="Add items with the + button above."
          />
        ) : (
          filtered.map((s) => {
            const daysToReturn = s.returnDeadline ? Math.ceil((new Date(s.returnDeadline).getTime() - Date.now()) / 86400000) : null;
            return (
              <motion.div key={s.id} layout whileTap={{ scale: 0.99 }}>
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <ShoppingBag size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-semibold leading-tight">{s.name}</p>
                        <p className="text-[15px] font-bold tabular-nums shrink-0">{formatINR(s.price)}</p>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{s.store}</p>

                      {/* Purchased badges */}
                      {tab === "purchased" && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {s.hasBill && (
                            <span className="flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-md font-medium">
                              <Camera size={10} /> Bill
                            </span>
                          )}
                          {s.warranty && (
                            <span className="flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-md font-medium">
                              <Shield size={10} /> {s.warranty}
                            </span>
                          )}
                          {daysToReturn !== null && (
                            <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-medium ${daysToReturn <= 3 ? "bg-foreground text-background" : "bg-muted"}`}>
                              <RotateCcw size={10} /> {daysToReturn > 0 ? `${daysToReturn}d to return` : "Last day"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Wishlist progress */}
                      {tab === "wishlist" && (
                        <div className="mt-2">
                          <ProgressBar value={Math.min(100, (50000 / s.price) * 100)} className="h-1.5" />
                          <p className="text-[11px] text-muted-foreground mt-1">₹50k saved · {Math.round((50000 / s.price) * 100)}% of goal</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        {tab === "pending" && (
                          <>
                            <motion.button whileTap={{ scale: 0.94 }} onClick={() => { markPurchased(s.id); toast.success("Marked as purchased"); }} className="flex-1 h-9 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-1.5">
                              <Check size={14} /> Mark purchased
                            </motion.button>
                            <button onClick={() => { moveToWishlist(s.id); toast.success("Moved to wishlist"); }} className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center" aria-label="Move to wishlist">
                              <Heart size={15} />
                            </button>
                          </>
                        )}
                        {tab === "wishlist" && (
                          <motion.button whileTap={{ scale: 0.94 }} onClick={() => { markPurchased(s.id); toast.success("Marked as purchased"); }} className="flex-1 h-9 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-1.5">
                            <Check size={14} /> Mark purchased
                          </motion.button>
                        )}
                        <motion.button whileTap={{ scale: 0.85 }} onClick={() => { addToTrash({ type: "shopping", title: s.name, subtitle: `${s.store || "—"} · ${s.status}`, data: s }); deleteShopping(s.id); toast.success("Item moved to Deleted Items"); }} className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground" aria-label="Delete">
                          <Trash2 size={15} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="fixed sheet-bottom left-0 right-0 z-50 rounded-t-[32px] bg-background sheet-safe-pb">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
              <div className="px-5 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-bold">Add Shopping Item</h2>
                  <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Item name</label>
                    <input autoFocus value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Mechanical Keyboard" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Price (₹)</label>
                    <input type="text" inputMode="numeric" value={addPrice} onChange={(e) => setAddPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 7500" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground font-medium">Store (optional)</label>
                    <input value={addStore} onChange={(e) => setAddStore(e.target.value)} placeholder="e.g. Amazon, IKEA" className="w-full mt-1 h-12 px-4 rounded-xl bg-muted text-[15px] outline-none placeholder:text-muted-foreground" />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} className="w-full h-[52px] mt-2 rounded-2xl bg-foreground text-background font-semibold text-[16px] flex items-center justify-center gap-2">
                    <Check size={18} /> Add Item
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
