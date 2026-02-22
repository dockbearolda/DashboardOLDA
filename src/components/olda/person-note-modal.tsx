"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteData {
  person: string;
  content: string;
  todos: TodoItem[];
}

interface PersonNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personKey: string;
  personName: string;
  personRole: string;
  initialNote: NoteData | null;
  onSave?: (note: NoteData) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PersonNoteModal({
  open,
  onOpenChange,
  personKey,
  personName,
  personRole,
  initialNote,
  onSave,
}: PersonNoteModalProps) {
  const [content, setContent]     = useState(initialNote?.content ?? "");
  const [todos, setTodos]         = useState<TodoItem[]>(initialNote?.todos ?? []);
  const [newTodo, setNewTodo]     = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const newTodoRef   = useRef<HTMLInputElement>(null);

  // Sync state when modal opens for a (possibly different) person
  useEffect(() => {
    if (open) {
      setContent(initialNote?.content ?? "");
      setTodos(initialNote?.todos ?? []);
      setSaveStatus("idle");
      // Resize textarea on next paint
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, 50);
    }
  }, [open, initialNote]);

  const persist = useCallback(
    async (c: string, t: TodoItem[]) => {
      setSaveStatus("saving");
      try {
        await fetch(`/api/notes/${personKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: c, todos: t }),
        });
        setSaveStatus("saved");
        onSave?.({ person: personKey, content: c, todos: t });
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    },
    [personKey, onSave]
  );

  const scheduleSave = useCallback(
    (c: string, t: TodoItem[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(c, t), 800);
    },
    [persist]
  );

  const handleContentChange = (val: string) => {
    setContent(val);
    scheduleSave(val, todos);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const t: TodoItem[] = [
      ...todos,
      { id: crypto.randomUUID(), text: newTodo.trim(), done: false },
    ];
    setTodos(t);
    setNewTodo("");
    scheduleSave(content, t);
    newTodoRef.current?.focus();
  };

  const toggleTodo = (id: string) => {
    const t = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
    setTodos(t);
    scheduleSave(content, t);
  };

  const deleteTodo = (id: string) => {
    const t = todos.filter((todo) => todo.id !== id);
    setTodos(t);
    scheduleSave(content, t);
  };

  const handleTodoKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addTodo(); }
  };

  const pending  = todos.filter((t) => !t.done).length;
  const total    = todos.length;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Panel — Apple Notes warm white */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex flex-col",
            "w-full max-w-2xl max-h-[85vh]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-black/[0.08] dark:border-white/[0.08]",
            "bg-[#FAFAF6] dark:bg-[#1C1C1E]",
            "shadow-[0_24px_80px_rgba(0,0,0,0.18)]",
            "overflow-hidden",
            "duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          {/* ── Toolbar ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">
                {personRole}
              </p>
              <DialogPrimitive.Title className="text-base font-bold text-foreground leading-none">
                {personName}
              </DialogPrimitive.Title>
            </div>

            <div className="flex items-center gap-3">
              {/* Save indicator */}
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enregistrement…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  Enregistré
                </span>
              )}

              {/* Close */}
              <DialogPrimitive.Close className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.12] transition-colors">
                <X className="h-3.5 w-3.5 text-foreground/70" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {/* Note section */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
                Note
              </p>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Commencer à écrire…"
                className={cn(
                  "w-full resize-none bg-transparent",
                  "text-[15px] leading-[1.75] text-foreground",
                  "placeholder:text-muted-foreground/30",
                  "focus:outline-none",
                  "min-h-[140px]",
                )}
                rows={6}
              />
            </section>

            {/* Divider */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />

            {/* Tâches section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Tâches
                </p>
                {total > 0 && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    {pending} / {total}
                  </span>
                )}
              </div>

              {/* Todo list */}
              <div className="space-y-0.5">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-start gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={cn(
                        "mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
                        todo.done
                          ? "border-amber-500 bg-amber-500"
                          : "border-border hover:border-amber-400"
                      )}
                    >
                      {todo.done && (
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                      )}
                    </button>

                    {/* Text */}
                    <span
                      className={cn(
                        "flex-1 text-[14px] leading-relaxed select-text",
                        todo.done
                          ? "line-through text-muted-foreground/40"
                          : "text-foreground"
                      )}
                    >
                      {todo.text}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity mt-[3px] flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
                    >
                      <X className="h-3 w-3 text-muted-foreground/60" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add todo row */}
              <div className="flex items-center gap-3 mt-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                <button
                  onClick={addTodo}
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                >
                  <Plus className="h-2.5 w-2.5 text-muted-foreground/50" />
                </button>
                <input
                  ref={newTodoRef}
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={handleTodoKey}
                  placeholder="Nouvelle tâche…"
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
                />
              </div>
            </section>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
