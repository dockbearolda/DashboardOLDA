"use client";

/**
 * PlanningTable — Planning d'entreprise complet
 * ─ Stepper 3 niveaux de priorité (Basse / Moyenne / Haute) — sélection directe
 * ─ Quantité : datalist (suggestions) + saisie libre
 * ─ Client : majuscule automatique
 * ─ Désignation : colonne large
 * ─ Note : popover via icône
 * ─ Total : calculé automatiquement (qté × prix unitaire)
 * ─ Date limite : ligne rouge si ≤ 1 jour ou dépassée
 * ─ État : menu déroulant 16 statuts
 * ─ Interne : sélection parmi Loïc, Charlie, Mélina, Amandine, Renaud
 * ─ Drag & drop vertical pour réordonner
 * ─ Optimistic UI : onChange met à jour l'état, onBlur persiste via API
 */

import { useState, useCallback, useMemo } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { Trash2, Plus, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanningItem {
  id: string;
  priority: "BASSE" | "MOYENNE" | "HAUTE";
  clientName: string;
  quantity: number;
  designation: string;
  note: string;
  unitPrice: number;
  deadline: string | null;
  status: PlanningStatus;
  responsible: string;
  position: number;
}

export type PlanningStatus =
  | "A_DEVISER"
  | "ATTENTE_VALIDATION"
  | "MAQUETTE_A_FAIRE"
  | "ATTENTE_MARCHANDISE"
  | "A_PREPARER"
  | "A_PRODUIRE"
  | "EN_PRODUCTION"
  | "A_MONTER_NETTOYER"
  | "MANQUE_INFORMATION"
  | "TERMINE"
  | "PREVENIR_CLIENT"
  | "CLIENT_PREVENU"
  | "RELANCE_CLIENT"
  | "PRODUIT_RECUPERE"
  | "A_FACTURER"
  | "FACTURE_FAITE";

interface PlanningTableProps {
  items: PlanningItem[];
  onItemsChange?: (items: PlanningItem[]) => void;
}

// ── Priorité ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, { active: string; inactive: string }> = {
  BASSE:   { active: "bg-green-500 text-white border-green-500",   inactive: "bg-gray-100 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-300" },
  MOYENNE: { active: "bg-orange-400 text-white border-orange-400", inactive: "bg-gray-100 text-gray-400 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300" },
  HAUTE:   { active: "bg-red-500 text-white border-red-500",       inactive: "bg-gray-100 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300" },
};

const PRIORITY_LABELS: Record<string, string> = {
  BASSE:   "Basse",
  MOYENNE: "Moy.",
  HAUTE:   "Haute",
};

// ── Statuts ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PlanningStatus, string> = {
  A_DEVISER:            "À deviser",
  ATTENTE_VALIDATION:   "Attente validation",
  MAQUETTE_A_FAIRE:     "Maquette à faire",
  ATTENTE_MARCHANDISE:  "Attente marchandise",
  A_PREPARER:           "À préparer",
  A_PRODUIRE:           "À produire",
  EN_PRODUCTION:        "En production",
  A_MONTER_NETTOYER:    "À monter/nettoyer",
  MANQUE_INFORMATION:   "Manque info",
  TERMINE:              "Terminé",
  PREVENIR_CLIENT:      "Prévenir client",
  CLIENT_PREVENU:       "Client prévenu",
  RELANCE_CLIENT:       "Relance client",
  PRODUIT_RECUPERE:     "Produit récupéré",
  A_FACTURER:           "À facturer",
  FACTURE_FAITE:        "Facture faite",
};

// ── Responsables internes ──────────────────────────────────────────────────────

const RESPONSIBLE_OPTIONS = [
  { key: "loic",     label: "LÖ", full: "Loïc"     },
  { key: "charlie",  label: "CH", full: "Charlie"   },
  { key: "melina",   label: "MÉ", full: "Mélina"    },
  { key: "amandine", label: "AM", full: "Amandine"  },
  { key: "renaud",   label: "RE", full: "Renaud"    },
];

// ── Suggestions quantités (datalist) ──────────────────────────────────────────

const QTY_PRESETS = [1, 5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 300, 500];

// ── Grille CSS ─────────────────────────────────────────────────────────────────
// [Priorité | Client | Qté | Désignation | Note | Prix unit. | Total | Date | État | Interne | ×]

const GRID_COLS =
  "grid-cols-[148px_155px_88px_1fr_52px_88px_78px_112px_178px_138px_40px]";
const CELL_CLASS = "px-2 py-2.5 truncate";

// ── Helpers ────────────────────────────────────────────────────────────────────

function isDeadlineCritical(deadline: string | null): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  // Rouge si ≤ 1 jour restant OU si la date est dépassée
  return diffDays <= 1;
}

// ── Composant principal ────────────────────────────────────────────────────────

export function PlanningTable({ items, onItemsChange }: PlanningTableProps) {
  const [isDeletingIds, setIsDeletingIds] = useState<Set<string>>(new Set());
  const [isAddingNew,   setIsAddingNew]   = useState(false);
  const [notePopover,   setNotePopover]   = useState<string | null>(null);

  const sortedItems = useMemo(
    () => {
      if (!Array.isArray(items)) return [];
      return [...items].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));
    },
    [items]
  );

  // ── Ajout d'une nouvelle ligne ─────────────────────────────────────────────

  const handleAddNew = useCallback(async () => {
    setIsAddingNew(true);
    try {
      const res = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority:    "MOYENNE",
          clientName:  "",
          quantity:    1,
          designation: "",
          note:        "",
          unitPrice:   0,
          deadline:    null,
          status:      "A_DEVISER",
          responsible: "",
        }),
      });
      const data = await res.json();
      onItemsChange?.([data.item, ...items]);
    } catch (err) {
      console.error("Failed to create planning item:", err);
    } finally {
      setTimeout(() => setIsAddingNew(false), 600);
    }
  }, [items, onItemsChange]);

  // ── Suppression ────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      setIsDeletingIds((prev) => new Set([...prev, id]));
      onItemsChange?.(items.filter((i) => i.id !== id));
      try {
        await fetch(`/api/planning/${id}`, { method: "DELETE" });
      } catch {
        const res  = await fetch("/api/planning");
        const data = await res.json();
        onItemsChange?.(data.items ?? []);
      }
    },
    [items, onItemsChange]
  );

  // ── Mise à jour optimiste ─────────────────────────────────────────────────

  const handleFieldChange = useCallback(
    (id: string, field: string, value: unknown) => {
      onItemsChange?.(
        items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    [items, onItemsChange]
  );

  const handleFieldBlur = useCallback(
    async (id: string, field: string, value: unknown) => {
      try {
        await fetch(`/api/planning/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
      } catch (err) {
        console.error("Failed to update planning item:", err);
      }
    },
    []
  );

  // ── Stepper priorité — sélection directe ─────────────────────────────────

  const handlePrioritySet = useCallback(
    async (id: string, priority: PlanningItem["priority"]) => {
      onItemsChange?.(
        items.map((item) => (item.id === id ? { ...item, priority } : item))
      );
      try {
        await fetch(`/api/planning/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        });
      } catch (err) {
        console.error("Failed to update priority:", err);
      }
    },
    [items, onItemsChange]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col gap-3 rounded-[18px] bg-white border border-gray-100 shadow-sm p-4 min-w-0"
      style={{
        fontFamily: "'Inter', 'Inter Variable', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Planning d&apos;Entreprise
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {sortedItems.length} ligne{sortedItems.length !== 1 ? "s" : ""}
          </p>
        </div>

        <motion.button
          onClick={handleAddNew}
          whileTap={{ scale: 0.92 }}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            isAddingNew
              ? "text-white bg-green-500 shadow-md"
              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
          )}
        >
          <Plus className="h-4 w-4" />
          {isAddingNew ? "Ajouté ✓" : "Nouvelle ligne"}
        </motion.button>
      </div>

      {/* ── En-tête colonnes ────────────────────────────────────────────────── */}
      <div className={cn("grid gap-0 border-b border-gray-100 pb-2", GRID_COLS)}>
        <div className="text-left   text-[11px] font-semibold text-gray-500 px-2">Priorité</div>
        <div className="text-left   text-[11px] font-semibold text-gray-500 px-2">Client</div>
        <div className="text-center text-[11px] font-semibold text-gray-500 px-2">Qté</div>
        <div className="text-left   text-[11px] font-semibold text-gray-500 px-2">Désignation</div>
        <div className="text-center text-[11px] font-semibold text-gray-500 px-2">Note</div>
        <div className="text-right  text-[11px] font-semibold text-gray-500 px-2">Prix unit.</div>
        <div className="text-right  text-[11px] font-semibold text-gray-500 px-2">Total</div>
        <div className="text-left   text-[11px] font-semibold text-gray-500 px-2">Date limite</div>
        <div className="text-left   text-[11px] font-semibold text-gray-500 px-2">État</div>
        <div className="text-center text-[11px] font-semibold text-gray-500 px-2">Interne</div>
        <div />
      </div>

      {/* ── Lignes ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0">
        <Reorder.Group
          as="div"
          axis="y"
          values={sortedItems}
          onReorder={(newOrder) => {
            const reordered = newOrder.map((item, idx) => ({ ...item, position: idx }));
            onItemsChange?.(
              items
                .filter((i) => !reordered.some((r) => r.id === i.id))
                .concat(reordered)
            );
            Promise.all(
              reordered.map((item) =>
                fetch(`/api/planning/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ position: item.position }),
                })
              )
            ).catch((err) => console.error("Failed to save positions:", err));
          }}
          className="flex flex-col"
        >
          <AnimatePresence mode="popLayout">
            {sortedItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center text-gray-400 text-sm"
              >
                Aucune ligne — cliquez sur &quot;Nouvelle ligne&quot; pour commencer
              </motion.div>
            ) : (
              sortedItems.map((item) => {
                if (!item?.id) return null;
                const isDeleting  = isDeletingIds.has(item.id);
                const total       = item.quantity * item.unitPrice;
                const urgentDate  = isDeadlineCritical(item.deadline);

                return (
                  <Reorder.Item key={item.id} value={item} as="div">
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 80 }}
                      className={cn(
                        "grid gap-0 border-b border-gray-100 transition-all group",
                        GRID_COLS,
                        isDeleting && "opacity-40 pointer-events-none",
                        urgentDate
                          ? "bg-red-50 hover:bg-red-100/70"
                          : "hover:bg-gray-50/80"
                      )}
                    >

                      {/* ── Priorité (148px) — stepper 3 boutons ────────────── */}
                      <div className="flex items-center gap-1 px-2 py-2.5">
                        {(["BASSE", "MOYENNE", "HAUTE"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => handlePrioritySet(item.id, p)}
                            title={p === "BASSE" ? "Priorité basse" : p === "MOYENNE" ? "Priorité moyenne" : "Priorité haute"}
                            className={cn(
                              "flex-1 py-1 rounded-md text-[10px] font-bold border transition-all",
                              item.priority === p
                                ? PRIORITY_COLORS[p].active
                                : PRIORITY_COLORS[p].inactive
                            )}
                          >
                            {PRIORITY_LABELS[p]}
                          </button>
                        ))}
                      </div>

                      {/* ── Client (155px) — majuscule auto ─────────────────── */}
                      <input
                        type="text"
                        value={item.clientName}
                        onChange={(e) =>
                          handleFieldChange(item.id, "clientName", e.target.value.toUpperCase())
                        }
                        onBlur={() => handleFieldBlur(item.id, "clientName", item.clientName)}
                        className={cn(
                          CELL_CLASS,
                          "bg-white border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
                          "text-gray-900 font-medium text-sm uppercase cursor-text",
                          "hover:border-gray-300 transition-colors"
                        )}
                        placeholder="CLIENT"
                      />

                      {/* ── Quantité (88px) — datalist + saisie libre ───────── */}
                      <div className="flex items-center justify-center px-2 py-2.5">
                        <input
                          type="number"
                          list={`qty-presets-${item.id}`}
                          value={item.quantity}
                          onChange={(e) =>
                            handleFieldChange(item.id, "quantity", parseFloat(e.target.value) || 1)
                          }
                          onBlur={() => handleFieldBlur(item.id, "quantity", item.quantity)}
                          className="w-full bg-white border border-transparent rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-900 text-sm text-center cursor-text hover:border-gray-300 transition-colors"
                          placeholder="1"
                          min="1"
                        />
                        <datalist id={`qty-presets-${item.id}`}>
                          {QTY_PRESETS.map((v) => (
                            <option key={v} value={v} />
                          ))}
                        </datalist>
                      </div>

                      {/* ── Désignation (1fr) — champ large ─────────────────── */}
                      <input
                        type="text"
                        value={item.designation}
                        onChange={(e) => handleFieldChange(item.id, "designation", e.target.value)}
                        onBlur={() => handleFieldBlur(item.id, "designation", item.designation)}
                        className={cn(
                          CELL_CLASS,
                          "bg-white border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
                          "text-gray-900 text-sm cursor-text hover:border-gray-300 transition-colors w-full"
                        )}
                        placeholder="Description de la commande…"
                      />

                      {/* ── Note (52px) — icône + popover ───────────────────── */}
                      <div className="relative flex items-center justify-center">
                        <button
                          onClick={() =>
                            setNotePopover(notePopover === item.id ? null : item.id)
                          }
                          title={item.note || "Ajouter une note"}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            item.note
                              ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                              : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          <StickyNote className="h-4 w-4" />
                        </button>
                        {notePopover === item.id && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-72">
                            <div className="px-3 py-2 border-b border-gray-100">
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Note</p>
                            </div>
                            <textarea
                              value={item.note}
                              onChange={(e) => handleFieldChange(item.id, "note", e.target.value)}
                              onBlur={() => {
                                handleFieldBlur(item.id, "note", item.note);
                                setNotePopover(null);
                              }}
                              autoFocus
                              className="w-full px-3 py-2.5 border-none focus:outline-none resize-none text-sm text-gray-800 rounded-b-xl"
                              rows={5}
                              placeholder="Écrire une note sur cette commande…"
                            />
                          </div>
                        )}
                      </div>

                      {/* ── Prix unitaire (88px) ─────────────────────────────── */}
                      <div className="flex items-center justify-end px-2 py-2.5">
                        <input
                          type="number"
                          value={item.unitPrice === 0 ? "" : item.unitPrice}
                          onChange={(e) =>
                            handleFieldChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          onBlur={() => handleFieldBlur(item.id, "unitPrice", item.unitPrice)}
                          className="w-full bg-white border border-transparent rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-900 text-sm text-right cursor-text hover:border-gray-300 transition-colors"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      {/* ── Total (78px) — lecture seule ────────────────────── */}
                      <div className={cn(CELL_CLASS, "text-right font-semibold text-sm", total > 0 ? "text-gray-800" : "text-gray-300")}>
                        {total > 0 ? `${total.toFixed(2)}€` : "—"}
                      </div>

                      {/* ── Date limite (112px) — rouge si urgente ───────────── */}
                      <input
                        type="date"
                        value={item.deadline ? item.deadline.split("T")[0] : ""}
                        onChange={(e) =>
                          handleFieldChange(item.id, "deadline", e.target.value || null)
                        }
                        onBlur={() => handleFieldBlur(item.id, "deadline", item.deadline)}
                        className={cn(
                          CELL_CLASS,
                          "rounded focus:outline-none focus:ring-1 text-sm cursor-text transition-colors",
                          urgentDate
                            ? "border border-red-400 bg-red-100 text-red-800 font-semibold focus:ring-red-400"
                            : "border border-transparent bg-white text-gray-900 hover:border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                        )}
                      />

                      {/* ── État (178px) — select 16 statuts ────────────────── */}
                      <select
                        value={item.status}
                        onChange={(e) => {
                          handleFieldChange(item.id, "status", e.target.value);
                          handleFieldBlur(item.id, "status", e.target.value);
                        }}
                        className={cn(
                          CELL_CLASS,
                          "bg-white border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
                          "text-gray-900 text-sm cursor-pointer hover:border-gray-300 transition-colors"
                        )}
                      >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>

                      {/* ── Interne (138px) — initiales cliquables ───────────── */}
                      <div className="flex items-center justify-center px-2 py-2.5 gap-1">
                        {RESPONSIBLE_OPTIONS.map((person) => {
                          const isActive = item.responsible === person.key;
                          return (
                            <button
                              key={person.key}
                              onClick={() => {
                                const next = isActive ? "" : person.key;
                                handleFieldChange(item.id, "responsible", next);
                                handleFieldBlur(item.id, "responsible", next);
                              }}
                              title={person.full}
                              className={cn(
                                "w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                                isActive
                                  ? "bg-blue-500 text-white shadow-sm scale-110"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              )}
                            >
                              {person.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Supprimer (40px) ─────────────────────────────────── */}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </motion.div>
                  </Reorder.Item>
                );
              })
            )}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* ── Pied — bouton rapide d'ajout ─────────────────────────────────────── */}
      {sortedItems.length > 0 && (
        <div className="pt-2 border-t border-gray-50">
          <button
            onClick={handleAddNew}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all border border-dashed border-gray-200 hover:border-gray-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une ligne
          </button>
        </div>
      )}

    </div>
  );
}
