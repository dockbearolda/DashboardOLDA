"use client";

/**
 * PRTManager — Premium Apple-style table for Loïc's PRT requests
 * ─ 5 columns: Client Name, Dimensions, Design, Color, Quantity
 * ─ Checkbox to mark as "FAIT" (done)
 * ─ Multiple selection with delete menu
 * ─ Add new row at top
 * ─ Swipe-to-delete
 * ─ Apple design: Inter font, 1px borders, 18px radius, alternating bg
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, Reorder, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PRTItem {
  id: string;
  clientName: string;
  dimensions: string;
  design: string;
  color: string;
  quantity: number;
  done: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}


interface PRTManagerProps {
  items: PRTItem[];
  onItemsChange?: (items: PRTItem[]) => void;
}

export function PRTManager({ items, onItemsChange }: PRTManagerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingIds, setIsDeletingIds] = useState<Set<string>>(new Set());

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items]
  );

  const handleToggleDone = useCallback(
    async (id: string) => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      );
      onItemsChange?.(updated);

      try {
        await fetch(`/api/prt-requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: !items.find((i) => i.id === id)?.done }),
        });
      } catch (err) {
        console.error("Failed to update PRT:", err);
      }
    },
    [items, onItemsChange]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setIsDeletingIds((prev) => new Set([...prev, id]));
      onItemsChange?.(items.filter((i) => i.id !== id));

      try {
        await fetch(`/api/prt-requests/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete PRT:", err);
        const res = await fetch("/api/prt-requests");
        const data = await res.json();
        onItemsChange?.(data.items ?? []);
      }
    },
    [items, onItemsChange]
  );

  const handleDeleteSelected = useCallback(async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/prt-requests/${id}`, { method: "DELETE" })
        )
      );
      onItemsChange?.(items.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to delete multiple PRTs:", err);
    }
  }, [selectedIds, items, onItemsChange]);

  const handleAddNew = useCallback(async () => {
    try {
      const res = await fetch("/api/prt-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: "",
          dimensions: "",
          design: "",
          color: "",
          quantity: 1,
        }),
      });
      const data = await res.json();
      onItemsChange?.([data.item, ...items]);
    } catch (err) {
      console.error("Failed to create PRT:", err);
    }
  }, [items, onItemsChange]);

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-white border border-gray-100 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xs font-bold text-gray-900 uppercase tracking-wider"
          style={{
            fontFamily: "'Inter', 'Inter Variable', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
        >
          Demandes PRT
        </h2>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          style={{
            fontFamily: "'Inter', 'Inter Variable', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
        >
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-5 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(sortedItems.map((i) => i.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Client</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Dimensions</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Design</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Couleur</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600">Qté</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            <Reorder.Group
              as="tbody"
              axis="y"
              values={sortedItems}
              onReorder={(newOrder) => {
                const reorderedItems = newOrder.map((item, idx) => ({
                  ...item,
                  position: idx,
                }));
                onItemsChange?.(items.filter((i) => !reorderedItems.some((r) => r.id === i.id)).concat(reorderedItems));
                Promise.all(
                  reorderedItems.map((item) =>
                    fetch(`/api/prt-requests/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ position: item.position }),
                    })
                  )
                ).catch((err) => console.error("Failed to save positions:", err));
              }}
            >
              <AnimatePresence mode="popLayout">
                {sortedItems.map((item, idx) => (
                  <Reorder.Item key={item.id} value={item} as="tr">
                    <motion.tr
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      className={cn(
                        "border-b border-gray-100 transition-all group hover:bg-gray-50/30",
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                        item.done && "opacity-50"
                      )}
                    >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedIds);
                        if (e.target.checked) {
                          newSelected.add(item.id);
                        } else {
                          newSelected.delete(item.id);
                        }
                        setSelectedIds(newSelected);
                      }}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={item.clientName}
                      onChange={(e) => {
                        const updated = items.map((i) =>
                          i.id === item.id ? { ...i, clientName: e.target.value } : i
                        );
                        onItemsChange?.(updated);
                      }}
                      onBlur={async () => {
                        try {
                          await fetch(`/api/prt-requests/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ clientName: item.clientName }),
                          });
                        } catch (err) {
                          console.error("Failed to update:", err);
                        }
                      }}
                      className="w-full bg-transparent border-none focus:outline-none focus:bg-white focus:border-b border-gray-200 text-gray-900 font-medium"
                      style={{ minWidth: "120px" }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={item.dimensions}
                      onChange={(e) => {
                        const updated = items.map((i) =>
                          i.id === item.id ? { ...i, dimensions: e.target.value } : i
                        );
                        onItemsChange?.(updated);
                      }}
                      onBlur={async () => {
                        try {
                          await fetch(`/api/prt-requests/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dimensions: item.dimensions }),
                          });
                        } catch (err) {
                          console.error("Failed to update:", err);
                        }
                      }}
                      className="w-full bg-transparent border-none focus:outline-none focus:bg-white focus:border-b border-gray-200 text-gray-900"
                      placeholder="e.g. 30x40cm"
                      style={{ minWidth: "100px" }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={item.design}
                      onChange={(e) => {
                        const updated = items.map((i) =>
                          i.id === item.id ? { ...i, design: e.target.value } : i
                        );
                        onItemsChange?.(updated);
                      }}
                      onBlur={async () => {
                        try {
                          await fetch(`/api/prt-requests/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ design: item.design }),
                          });
                        } catch (err) {
                          console.error("Failed to update:", err);
                        }
                      }}
                      className="w-full bg-transparent border-none focus:outline-none focus:bg-white focus:border-b border-gray-200 text-gray-900"
                      placeholder="Design name"
                      style={{ minWidth: "100px" }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={item.color}
                      onChange={(e) => {
                        const updated = items.map((i) =>
                          i.id === item.id ? { ...i, color: e.target.value } : i
                        );
                        onItemsChange?.(updated);
                      }}
                      onBlur={async () => {
                        try {
                          await fetch(`/api/prt-requests/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ color: item.color }),
                          });
                        } catch (err) {
                          console.error("Failed to update:", err);
                        }
                      }}
                      className="w-full bg-transparent border-none focus:outline-none focus:bg-white focus:border-b border-gray-200 text-gray-900"
                      placeholder="e.g. Blanc"
                      style={{ minWidth: "80px" }}
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = items.map((i) =>
                          i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                        );
                        onItemsChange?.(updated);
                      }}
                      onBlur={async () => {
                        try {
                          await fetch(`/api/prt-requests/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ quantity: item.quantity }),
                          });
                        } catch (err) {
                          console.error("Failed to update:", err);
                        }
                      }}
                      className="w-12 bg-transparent border-none focus:outline-none focus:bg-white focus:border-b border-gray-200 text-gray-900 text-right"
                    />
                  </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleDone(item.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            item.done
                              ? "text-green-600 bg-green-50"
                              : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <motion.button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                </Reorder.Item>
              ))}
              </AnimatePresence>
            </Reorder.Group>
          </tbody>
        </table>
      </div>

      {/* Delete selected button */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors shadow-lg"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer {selectedIds.size}
          </button>
        </motion.div>
      )}

      {/* Empty state */}
      {sortedItems.length === 0 && (
        <div className="py-8 text-center text-gray-400 text-sm">
          Aucune demande PRT
        </div>
      )}
    </div>
  );
}
