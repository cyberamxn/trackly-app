"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, Trash2, Pencil, CheckCircle2, Clock, Library,
} from "lucide-react";
import { toast } from "sonner";
import { useTracklyStore } from "@/lib/trackly/store";
import { useStudentData, type Book } from "@/lib/trackly/studentData";
import {
  ScreenHeader, ScreenWrapper, Card, SheetModal, EmptyState, ProgressBar,
} from "../../ui";

export function Books() {
  const { setScreen } = useTracklyStore();
  const student = useStudentData();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);

  const inProgress = useMemo(
    () => student.books.filter((b) => b.readPages < b.totalPages),
    [student.books]
  );
  const finished = useMemo(
    () => student.books.filter((b) => b.readPages >= b.totalPages),
    [student.books]
  );

  const totalPages = student.books.reduce((s, b) => s + b.totalPages, 0);
  const readPages = student.books.reduce((s, b) => s + b.readPages, 0);
  const overallPct = totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0;

  const handleSave = (data: Omit<Book, "id">) => {
    if (editing) {
      student.updateBook(editing.id, data);
      toast.success("Book updated");
    } else {
      student.addBook(data);
      toast.success("Book added to library");
    }
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    student.deleteBook(id);
    toast.success("Book removed");
    setShowAdd(false);
    setEditing(null);
  };

  const handleIncrement = (b: Book) => {
    const next = Math.min(b.totalPages, b.readPages + 10);
    student.updateBook(b.id, { readPages: next });
    if (next >= b.totalPages) {
      toast.success(`Finished: ${b.title}! 🎉`);
    } else {
      toast.success(`+10 pages · ${next}/${b.totalPages}`);
    }
  };

  return (
    <ScreenWrapper>
      <ScreenHeader
        title="Book Library"
        subtitle={`${student.books.length} books · ${overallPct}% read`}
        onBack={() => setScreen("student-dashboard")}
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setEditing(null); setShowAdd(true); }}
            className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center"
            aria-label="Add book"
          >
            <Plus size={18} />
          </motion.button>
        }
      />

      {/* Overall progress */}
      <div className="px-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="bg-foreground text-background">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Reading Progress</p>
                <p className="text-[24px] font-bold mt-0.5 text-display">{readPages.toLocaleString()} <span className="opacity-60 text-[16px]">/ {totalPages.toLocaleString()}</span></p>
                <p className="text-[12px] opacity-80 mt-0.5">pages across {student.books.length} books</p>
              </div>
              <div className="text-right">
                <p className="text-[32px] font-bold tabular-nums text-display">{overallPct}%</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">complete</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-background/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className="h-full bg-background rounded-full"
              />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* In Progress */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[18px] font-bold tracking-tight">In Progress</h2>
          <span className="text-[12px] text-muted-foreground tabular-nums">{inProgress.length}</span>
        </div>

        {inProgress.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen size={20} className="text-muted-foreground" />}
              title="No books in progress"
              description="Add a book to start tracking your reading."
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {inProgress.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                onEdit={() => { setEditing(b); setShowAdd(true); }}
                onIncrement={() => handleIncrement(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Finished */}
      {finished.length > 0 && (
        <div className="px-5 mt-6 pb-32">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[18px] font-bold tracking-tight text-muted-foreground">Finished</h2>
            <span className="text-[12px] text-muted-foreground tabular-nums">{finished.length}</span>
          </div>
          <div className="space-y-2.5">
            {finished.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                finished
                onEdit={() => { setEditing(b); setShowAdd(true); }}
                onIncrement={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {finished.length === 0 && inProgress.length === 0 && (
        <div className="px-5 mt-6 pb-32">
          <Card>
            <EmptyState
              icon={<Library size={20} className="text-muted-foreground" />}
              title="Empty library"
              description="Build your reading list — add textbooks, novels, or borrowed books."
              action={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditing(null); setShowAdd(true); }}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-[13px] font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add book
                </motion.button>
              }
            />
          </Card>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <BookFormSheet
            book={editing}
            onClose={() => { setShowAdd(false); setEditing(null); }}
            onSave={handleSave}
            onDelete={editing ? () => handleDelete(editing.id) : undefined}
          />
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

function BookCard({
  book,
  finished = false,
  onEdit,
  onIncrement,
}: {
  book: Book;
  finished?: boolean;
  onEdit: () => void;
  onIncrement: () => void;
}) {
  const pct = book.totalPages > 0 ? Math.round((book.readPages / book.totalPages) * 100) : 0;
  const borrowed = book.type === "borrowed";
  const dueDays = book.dueDate
    ? Math.ceil((new Date(book.dueDate).getTime() - Date.now()) / 86400000)
    : null;
  const overdue = dueDays !== null && dueDays < 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={finished ? "opacity-70" : ""}>
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${finished ? "bg-foreground text-background" : "bg-muted"}`}>
            {finished ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
          </div>
          <div className="flex-1 min-w-0" onClick={onEdit}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight truncate">{book.title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{book.author}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                borrowed ? "bg-foreground text-background" : "bg-muted text-foreground"
              }`}>
                {borrowed ? "Borrowed" : "Owned"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 mb-1">
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {book.readPages.toLocaleString()} / {book.totalPages.toLocaleString()} pages · {pct}%
              </p>
              {borrowed && book.library && (
                <p className="text-[11px] text-muted-foreground">{book.library}</p>
              )}
            </div>
            <ProgressBar value={pct} className="h-1.5" />
            {borrowed && book.dueDate && !finished && (
              <div className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${overdue ? "text-foreground" : "text-muted-foreground"}`}>
                <Clock size={11} />
                {overdue
                  ? `Overdue by ${Math.abs(dueDays!)}d`
                  : dueDays === 0
                    ? "Due today"
                    : `Due in ${dueDays}d · ${new Date(book.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
              </div>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0"
            aria-label="Edit"
          >
            <Pencil size={12} />
          </motion.button>
        </div>

        {!finished && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onIncrement}
            disabled={pct >= 100}
            className="w-full h-9 mt-3 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Read 10 more pages
          </motion.button>
        )}
      </Card>
    </motion.div>
  );
}

function BookFormSheet({
  book,
  onClose,
  onSave,
  onDelete,
}: {
  book: Book | null;
  onClose: () => void;
  onSave: (data: Omit<Book, "id">) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState<string>(book?.title ?? "");
  const [author, setAuthor] = useState<string>(book?.author ?? "");
  const [type, setType] = useState<Book["type"]>(book?.type ?? "purchased");
  const [totalPages, setTotalPages] = useState<string>(book ? String(book.totalPages) : "300");
  const [readPages, setReadPages] = useState<string>(book ? String(book.readPages) : "0");
  const [dueDate, setDueDate] = useState<string>(book?.dueDate ?? "");
  const [library, setLibrary] = useState<string>(book?.library ?? "");
  const [notes, setNotes] = useState<string>(book?.notes ?? "");

  const valid = title.trim().length > 0 && author.trim().length > 0;

  const submit = () => {
    if (!valid) {
      toast.error("Please enter a title and author");
      return;
    }
    onSave({
      title: title.trim(),
      author: author.trim(),
      type,
      totalPages: Math.max(1, parseInt(totalPages) || 1),
      readPages: Math.max(0, Math.min(parseInt(totalPages) || 0, parseInt(readPages) || 0)),
      dueDate: type === "borrowed" && dueDate ? dueDate : undefined,
      library: type === "borrowed" && library.trim() ? library.trim() : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <SheetModal open onClose={onClose} title={book ? "Edit Book" : "Add Book"}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Algorithms"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Author">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. CLRS"
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Type">
          <div className="flex gap-1.5">
            <Chip label="Purchased" active={type === "purchased"} onClick={() => setType("purchased")} />
            <Chip label="Borrowed" active={type === "borrowed"} onClick={() => setType("borrowed")} />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total pages">
            <input
              type="number"
              inputMode="numeric"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
          <Field label="Pages read">
            <input
              type="number"
              inputMode="numeric"
              value={readPages}
              onChange={(e) => setReadPages(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none tabular-nums"
            />
          </Field>
        </div>
        {type === "borrowed" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none"
                />
              </Field>
              <Field label="Library">
                <input
                  value={library}
                  onChange={(e) => setLibrary(e.target.value)}
                  placeholder="e.g. College Library"
                  className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
                />
              </Field>
            </div>
          </>
        )}
        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes, key takeaways, or chapter markers..."
            rows={2}
            className="w-full bg-muted rounded-xl px-3.5 py-3 text-[15px] outline-none placeholder:text-muted-foreground resize-none"
          />
        </Field>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onDelete}
              className="h-12 px-4 rounded-2xl border border-border flex items-center justify-center gap-2 text-[14px] font-semibold"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            className={`flex-1 h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 ${
              valid ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {book ? "Save changes" : "Add book"}
          </motion.button>
        </div>
      </div>
    </SheetModal>
  );
}

function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 rounded-xl text-[14px] font-semibold border transition-colors ${
        active ? "bg-foreground text-background border-foreground" : "bg-transparent text-foreground border-border"
      }`}
    >
      {label}
    </motion.button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</p>
      {children}
    </div>
  );
}
