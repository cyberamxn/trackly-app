"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pin, Mic, Image as ImageIcon, ListChecks, MoreHorizontal,
  Trash2, X, Check, ChevronLeft, Edit3, Share2, Archive,
} from "lucide-react";
import { toast } from "sonner";
import { useAppData, type Note } from "@/lib/trackly/appData";
import { useTrashStore } from "@/lib/trackly/trash";
import { Card, ScreenHeader, Chip, SheetModal, EmptyState, Toggle } from "../ui";

type View = "list" | "detail" | "edit" | "new";

export function Notes() {
  const notes = useAppData((s) => s.notes);
  const addNote = useAppData((s) => s.addNote);
  const deleteNote = useAppData((s) => s.deleteNote);
  const addToTrash = useTrashStore((s) => s.addToTrash);
  const togglePinNote = useAppData((s) => s.togglePinNote);
  const updateNote = useAppData((s) => s.updateNote);

  const [filter, setFilter] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [view, setView] = useState<View>("list");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editPinned, setEditPinned] = useState(false);
  const [editHasChecklist, setEditHasChecklist] = useState(false);
  const [editHasImage, setEditHasImage] = useState(false);
  const [editHasVoice, setEditHasVoice] = useState(false);

  const tags = Array.from(new Set(notes.flatMap((n) => n.tags ?? [])));

  // Apply filters + search
  let filtered = notes;
  if (filter) filtered = filtered.filter((n) => n.tags?.includes(filter));
  if (searchQ.trim()) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter((n) =>
      n.title.toLowerCase().includes(q) || n.preview.toLowerCase().includes(q)
    );
  }

  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);

  // ===== Handlers =====
  const openNote = (note: Note) => {
    setSelectedNote(note);
    setView("detail");
  };

  const openEdit = (note: Note) => {
    setEditTitle(note.title);
    setEditBody(note.preview);
    setEditTags(note.tags?.join(", ") ?? "");
    setEditPinned(note.pinned);
    setEditHasChecklist(note.hasChecklist ?? false);
    setEditHasImage(note.hasImage ?? false);
    setEditHasVoice(note.hasVoice ?? false);
    setSelectedNote(note);
    setView("edit");
    setShowActions(false);
  };

  const openNew = () => {
    setEditTitle("");
    setEditBody("");
    setEditTags("");
    setEditPinned(false);
    setEditHasChecklist(false);
    setEditHasImage(false);
    setEditHasVoice(false);
    setSelectedNote(null);
    setView("new");
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const tagArray = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: editTitle.trim(),
      preview: editBody.trim() || editTitle.trim(),
      tags: tagArray,
      hasImage: editHasImage,
      hasVoice: editHasVoice,
      hasChecklist: editHasChecklist,
    };

    if (view === "new") {
      addNote(payload);
      toast.success("Note created");
    } else if (view === "edit" && selectedNote) {
      updateNote(selectedNote.id, { ...payload, pinned: editPinned });
      toast.success("Note updated");
    }
    setView("list");
    setSelectedNote(null);
  };

  const handleDelete = (note: Note) => {
    // Soft delete — note moves to the Deleted Items folder (counted, restorable)
    addToTrash({
      type: "note",
      title: note.title,
      subtitle: `${note.preview?.slice(0, 40) || "Note"}`,
      data: note,
    });
    deleteNote(note.id);
    toast.success("Note moved to Deleted Items");
    setView("list");
    setSelectedNote(null);
    setShowActions(false);
  };

  const handlePin = (note: Note) => {
    togglePinNote(note.id);
    toast.success(note.pinned ? "Note unpinned" : "Note pinned");
    setShowActions(false);
  };

  // ===== Detail / Edit View =====
  if (view === "detail" && selectedNote) {
    return (
      <div className="absolute inset-0 flex flex-col">
        <div className="px-5 pt-2 pb-3 flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setView("list"); setSelectedNote(null); }}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center -ml-1"
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </motion.button>
          <div className="flex-1" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => openEdit(selectedNote)}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
            aria-label="Edit"
          >
            <Edit3 size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowActions(true)}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
            aria-label="More"
          >
            <MoreHorizontal size={16} />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar ios-scroll px-5 pb-32">
          <div className="flex items-center gap-2 mb-3">
            {selectedNote.pinned && <Pin size={14} className="text-muted-foreground" />}
            <p className="text-[12px] text-muted-foreground">
              {new Date(selectedNote.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-4">{selectedNote.title}</h1>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{selectedNote.preview}</p>

          {selectedNote.tags && selectedNote.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {selectedNote.tags.map((t) => (
                <span key={t} className="text-[11px] uppercase tracking-wider bg-muted px-2 py-1 rounded-md font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Attachments row */}
          <div className="flex items-center gap-3 mt-6">
            {selectedNote.hasImage && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <ImageIcon size={14} /> Image
              </div>
            )}
            {selectedNote.hasVoice && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Mic size={14} /> Voice note
              </div>
            )}
            {selectedNote.hasChecklist && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <ListChecks size={14} /> Checklist
              </div>
            )}
          </div>
        </div>

        {/* Action Sheet */}
        <SheetModal open={showActions} onClose={() => setShowActions(false)} title="Note actions">
          <div className="space-y-1">
            <ActionButton
              icon={<Pin size={18} />}
              label={selectedNote.pinned ? "Unpin note" : "Pin note"}
              onClick={() => handlePin(selectedNote)}
            />
            <ActionButton
              icon={<Edit3 size={18} />}
              label="Edit note"
              onClick={() => openEdit(selectedNote)}
            />
            <ActionButton
              icon={<Share2 size={18} />}
              label="Share"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: selectedNote.title, text: selectedNote.preview }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(`${selectedNote.title}\n\n${selectedNote.preview}`);
                  toast.success("Copied to clipboard");
                }
                setShowActions(false);
              }}
            />
            <ActionButton
              icon={<Archive size={18} />}
              label="Archive"
              onClick={() => {
                toast.success("Note archived");
                setShowActions(false);
                setView("list");
                setSelectedNote(null);
              }}
            />
            <ActionButton
              icon={<Trash2 size={18} />}
              label="Delete note"
              danger
              onClick={() => handleDelete(selectedNote)}
            />
          </div>
        </SheetModal>
      </div>
    );
  }

  // ===== Edit / New View =====
  if (view === "edit" || view === "new") {
    return (
      <div className="absolute inset-0 flex flex-col">
        <div className="px-5 pt-2 pb-3 flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setView("list"); setSelectedNote(null); }}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center -ml-1"
            aria-label="Cancel"
          >
            <X size={20} />
          </motion.button>
          <div className="flex-1" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSave}
            className="h-9 px-4 rounded-full bg-foreground text-background flex items-center gap-1.5 text-[13px] font-semibold"
          >
            <Check size={16} />
            Save
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar ios-scroll px-5 pb-32">
          <input
            autoFocus={view === "new"}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            className="w-full text-[24px] font-bold tracking-tight bg-transparent outline-none placeholder:text-muted-foreground mb-3"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="Start writing..."
            rows={12}
            className="w-full text-[15px] leading-relaxed bg-transparent outline-none placeholder:text-muted-foreground resize-none"
          />

          {/* Tags */}
          <div className="mt-4">
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tags (comma separated)</p>
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="work, personal, ideas"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-[14px] outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Attachment toggles */}
          <div className="mt-4">
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Attachments</p>
            <Card className="p-0">
              <div className="px-4 py-3 border-b border-border">
                <Toggle checked={editHasImage} onChange={setEditHasImage} label="Image" description="Attach an image" />
              </div>
              <div className="px-4 py-3 border-b border-border">
                <Toggle checked={editHasVoice} onChange={setEditHasVoice} label="Voice note" description="Record audio" />
              </div>
              <div className="px-4 py-3">
                <Toggle checked={editHasChecklist} onChange={setEditHasChecklist} label="Checklist" description="Add a to-do list" />
              </div>
            </Card>
          </div>

          {/* Pin toggle */}
          <div className="mt-4">
            <Card className="p-4">
              <Toggle checked={editPinned} onChange={setEditPinned} label="Pin this note" description="Pinned notes appear at the top" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ===== List View =====
  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar ios-scroll pb-32">
      <ScreenHeader
        title="Notes"
        subtitle={`${notes.length} notes`}
        right={
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSearch(!showSearch)}
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
              aria-label="Search"
            >
              {showSearch ? <X size={16} /> : <Search size={16} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={openNew}
              className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
              aria-label="New note"
            >
              <Plus size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        }
      />

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 mt-1 overflow-hidden"
          >
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-muted rounded-xl pl-9 pr-9 py-2.5 text-[14px] outline-none placeholder:text-muted-foreground"
              />
              {searchQ && (
                <button
                  onClick={() => setSearchQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/40 flex items-center justify-center"
                >
                  <X size={11} className="text-background" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 mt-1 pb-1">
        <Chip label="All" active={!filter} onClick={() => setFilter(null)} />
        {tags.map((t) => (
          <Chip key={t} label={cap(t)} active={filter === t} onClick={() => setFilter(t === filter ? null : t)} />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="px-5 mt-4">
          <EmptyState
            icon={<ListChecks size={20} className="text-muted-foreground" />}
            title={searchQ ? "No matching notes" : filter ? `No ${filter} notes` : "No notes yet"}
            description={
              searchQ
                ? `No notes match "${searchQ}"`
                : filter
                ? `You have no notes tagged "${filter}"`
                : "Tap the + button above to create your first note."
            }
          />
        </div>
      ) : (
        <>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <div className="px-5 mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Pin size={11} className="text-muted-foreground" />
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pinned</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} onClick={() => openNote(n)} onPin={() => handlePin(n)} />
                ))}
              </div>
            </div>
          )}

          {/* All notes */}
          {others.length > 0 && (
            <div className="px-5 mt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">All Notes</p>
              <div className="grid grid-cols-2 gap-3">
                {others.map((n) => (
                  <NoteCard key={n.id} note={n} onClick={() => openNote(n)} onPin={() => handlePin(n)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NoteCard({ note, onClick, onPin }: { note: Note; onClick: () => void; onPin: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={onClick}>
      <Card className="p-3.5 h-full cursor-pointer">
        <div className="flex items-start justify-between">
          <p className="text-[14px] font-semibold leading-tight line-clamp-2 flex-1">{note.title}</p>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className="shrink-0 ml-1 -mr-1 p-1"
            aria-label={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={12} className={note.pinned ? "text-foreground fill-foreground" : "text-muted-foreground"} />
          </motion.button>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1 line-clamp-3 leading-snug">{note.preview}</p>

        <div className="flex items-center gap-1.5 mt-3">
          {note.hasImage && <ImageIcon size={11} className="text-muted-foreground" />}
          {note.hasVoice && <Mic size={11} className="text-muted-foreground" />}
          {note.hasChecklist && <ListChecks size={11} className="text-muted-foreground" />}
          {note.tags?.map((t) => (
            <span key={t} className="text-[9px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded font-medium">{t}</span>
          ))}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {new Date(note.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted ${danger ? "text-foreground" : ""}`}
    >
      {icon}
      <span className="flex-1 text-left text-[15px] font-medium">{label}</span>
    </motion.button>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
