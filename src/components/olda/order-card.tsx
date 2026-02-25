"use client";

/**
 * OrderCard (Refonte Apple Premium + Accordéon)
 * ─ Bulle fermée (Apple design: 18px coins, #FFFFFF, #E5E5E5 bordure, SF Pro)
 * ─ Accordéon pour détails secondaires
 * ─ Mode print optimisé (A4, images agrandies, UI masquée)
 * ─ Aucun label (juste valeurs: "XL" pas "Taille : XL")
 * ─ Valeurs vides = rien affiché
 */

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronDown } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { OldaExtraData } from "@/types/order";

// ── Hooks utilitaires ──────────────────────────────────────────────────────

/** Retourne l'URL d'origine du dashboard (client-side only) */
function useOrigin() {
  const [o, setO] = useState("");
  useEffect(() => {
    setO(typeof window !== "undefined" ? window.location.origin : "");
  }, []);
  return o;
}

/** Lit les images locales depuis localStorage */
function useLocalImages(orderId: string) {
  const key = `olda-images-${orderId}`;
  const [imgs, setImgs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setImgs(JSON.parse(stored) as string[]);
      }
    } catch {
      // ignore
    }
  }, [key]);

  const addImage = (dataUrl: string) => {
    setImgs((prev) => {
      const updated = [...prev, dataUrl].slice(0, 2);
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {
        // quota
      }
      return updated;
    });
  };

  return { localImages: imgs, addImage };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convertit centimes → "15,00 €" */
function fmtPrice(centimes: number | undefined): string {
  if (!centimes) return "0,00 €";
  const euros = centimes / 100;
  return euros.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Détecte si c'est un code DTF (pas une URL) */
function isDtfCode(s: string | undefined | null): boolean {
  if (!s) return false;
  return !s.startsWith("http") && !s.startsWith("data:");
}

/** Génère le label "limit" : "Dans 3j · 15 jan" | "Aujourd'hui !" | "⚠️ En retard" */
function limitLabel(limit: string | undefined | null): string | null {
  if (!limit) return null;
  try {
    const d = new Date(limit);
    if (isNaN(d.getTime())) return limit; // texte brut non parseable

    const diff = differenceInCalendarDays(d, new Date());
    if (diff < 0) return `⚠️ En retard (${Math.abs(diff)}j)`;
    if (diff === 0) return "Aujourd'hui !";
    if (diff === 1) return "Demain";
    return `Dans ${diff}j · ${format(d, "d MMM", { locale: fr })}`;
  } catch {
    return limit;
  }
}

// ── Composant Principal ────────────────────────────────────────────────────

export interface OrderCardProps {
  data: OldaExtraData;
  orderId?: string;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function OrderCard({
  data,
  orderId = "unknown",
}: OrderCardProps) {
  const origin = useOrigin();
  const { localImages } = useLocalImages(orderId);

  // ── État d'accordéon ──
  const [isOpen, setIsOpen] = useState(false);

  // ── Extraire et formater les données ──
  const commande = data.commande || "";
  const prenom = data.prenom || "";
  const nom = data.nom || "";
  const telephone = data.telephone || "";
  const limitTxt = limitLabel(data.limit);

  // Images: priorité images locales, puis fiche.visuelAvant/Arrière
  const visuelAvant = localImages[0] || data.fiche?.visuelAvant;
  const visuelArriere = localImages[1] || data.fiche?.visuelArriere;

  // Infos immédiates (ligne discrète)
  const typeProduit = data.fiche?.typeProduit;
  const couleur = data.fiche?.couleur;
  const tailleDTF = data.fiche?.tailleDTFAr;

  // Détails accordéon
  const collection = data.collection;
  const reference = data.reference;
  const taille = data.taille;
  const note = data.note;

  // Impression
  const refPrt = data.prt?.refPrt;
  const taillePrt = data.prt?.taillePrt;
  const quantite = data.prt?.quantite;

  // Prix
  const prix = data.prix?.total;

  // QR code
  const qrValue = origin && commande
    ? `${origin}/dashboard/orders/${orderId}`
    : commande || "olda";

  // ── Rendu ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Styles de print */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .olda-card-print, .olda-card-print * { visibility: visible !important; }
          .olda-card-print {
            position: fixed !important;
            inset: 0 !important;
            padding: 1cm !important;
            background: white !important;
            width: 21cm !important;
            height: 29.7cm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .olda-card-print img {
            width: 50% !important;
            height: auto !important;
            margin: 1cm auto !important;
          }
        }
      `}</style>

      {/* ══ MODE PRINT (seul ce bloc s'affiche à l'impression) ═════════════ */}
      <div className="olda-card-print hidden print:block">
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{prenom} {nom}</h1>
            {telephone && <p className="text-sm text-gray-600">{telephone}</p>}
          </div>

          {visuelAvant && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">AVANT</p>
              {isDtfCode(visuelAvant) ? (
                <div className="border border-gray-300 p-2 rounded text-sm font-mono">
                  {visuelAvant}
                </div>
              ) : (
                <img src={visuelAvant} alt="Avant" className="max-h-40" />
              )}
            </div>
          )}

          {visuelArriere && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">ARRIÈRE</p>
              {isDtfCode(visuelArriere) ? (
                <div className="border border-gray-300 p-2 rounded text-sm font-mono">
                  {visuelArriere}
                </div>
              ) : (
                <img src={visuelArriere} alt="Arrière" className="max-h-40" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODE ÉCRAN (bulle + accordéon) ═════════════════════════════════ */}
      <div className="print:hidden">
        {/* BULLE FERMÉE */}
        <div
          className={cn(
            "rounded-[18px] border border-[#E5E5E5] bg-white p-4",
            "shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)]",
            "transition-all duration-200",
            "font-[-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif]"
          )}
        >
          {/* Header: QR + Identité */}
          <div className="flex gap-4 items-start">
            {/* QR Code — 64×64px */}
            {commande && (
              <div className="shrink-0">
                <QRCodeSVG
                  value={qrValue}
                  size={64}
                  bgColor="#ffffff"
                  fgColor="#1d1d1f"
                  level="M"
                />
              </div>
            )}

            {/* Identité (PRENOM NOM en bold UPPERCASE) */}
            <div className="flex-1">
              {(prenom || nom) && (
                <p className="text-base font-bold uppercase leading-tight">
                  {prenom} {nom}
                </p>
              )}
              {telephone && (
                <p className="text-sm text-gray-500 mt-1">{telephone}</p>
              )}
              {limitTxt && (
                <p className="text-sm text-gray-500 mt-0.5">{limitTxt}</p>
              )}
            </div>
          </div>

          {/* Visuels: Avant/Arrière côte à côte */}
          {(visuelAvant || visuelArriere) && (
            <div className="flex gap-3 mt-4">
              {visuelAvant && (
                <div className="flex-1">
                  {isDtfCode(visuelAvant) ? (
                    <div className="w-24 h-24 rounded-[12px] border border-[#E5E5E5] bg-gray-50 flex items-center justify-center p-2 text-xs font-mono text-gray-600 text-center overflow-hidden">
                      {visuelAvant}
                    </div>
                  ) : (
                    <img
                      src={visuelAvant}
                      alt="Avant"
                      className="w-24 h-24 rounded-[12px] border border-[#E5E5E5] object-cover"
                    />
                  )}
                </div>
              )}
              {visuelArriere && (
                <div className="flex-1">
                  {isDtfCode(visuelArriere) ? (
                    <div className="w-24 h-24 rounded-[12px] border border-[#E5E5E5] bg-gray-50 flex items-center justify-center p-2 text-xs font-mono text-gray-600 text-center overflow-hidden">
                      {visuelArriere}
                    </div>
                  ) : (
                    <img
                      src={visuelArriere}
                      alt="Arrière"
                      className="w-24 h-24 rounded-[12px] border border-[#E5E5E5] object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Infos Immédiates (ligne discrète: type · couleur · taille) */}
          {(typeProduit || couleur || tailleDTF) && (
            <p className="text-xs text-gray-500 mt-3">
              {[typeProduit, couleur, tailleDTF].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Footer: Prix */}
          {prix !== undefined && (
            <div className="flex justify-end mt-4">
              <p className="text-lg font-bold">{fmtPrice(prix)}</p>
            </div>
          )}

          {/* Chevron pour accordéon */}
          {(collection || reference || taille || note || refPrt) && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center h-6 w-6 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Toggle accordion"
              >
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-gray-400 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* ACCORDÉON (détails déployés) */}
        {isOpen && (
          <div
            className={cn(
              "rounded-b-[18px] border border-t-0 border-[#E5E5E5] bg-gray-50 p-4",
              "space-y-3 text-sm"
            )}
          >
            {collection && (
              <div>
                <p className="text-gray-600">{collection}</p>
              </div>
            )}

            {reference && (
              <div>
                <p className="text-gray-600">{reference}</p>
              </div>
            )}

            {taille && (
              <div>
                <p className="text-gray-600">{taille}</p>
              </div>
            )}

            {note && (
              <div>
                <p className="text-gray-600 break-words">{note}</p>
              </div>
            )}

            {/* Bloc PRT */}
            {(refPrt || taillePrt || quantite !== undefined) && (
              <div className="rounded-lg border border-[#E5E5E5] bg-white p-3">
                <div className="space-y-1 text-xs text-gray-500">
                  {refPrt && <p>Ref: {refPrt}</p>}
                  {taillePrt && <p>Taille: {taillePrt}</p>}
                  {quantite !== undefined && <p>Qté: {quantite}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
