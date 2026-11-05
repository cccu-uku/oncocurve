"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import {
  STEP_REGISTRY,
  TOUR_PLAYLISTS,
  normalizeVariant,
  resolveStep,
  type TourPage,
  type TourStepDef,
  type TourVariant,
} from "./guided-tour-steps";
import { placeTooltip, whenElementPresent } from "./guided-tour-target";

export type { TourPage, TourStepDef, TourVariant };

// --- shared tour position (sessionStorage so it survives navigation) ---------
const KEY = "oncocurve:tourIdx";
const VKEY = "oncocurve:tourVariant";
const EVT = "oncocurve:tour";

export function getTourIdx(): number | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(KEY);
  return v === null ? null : Number(v);
}
export function setTourIdx(i: number | null) {
  if (typeof window === "undefined") return;
  if (i === null) {
    window.sessionStorage.removeItem(KEY);
    window.sessionStorage.removeItem(VKEY);
  } else {
    window.sessionStorage.setItem(KEY, String(i));
  }
  window.dispatchEvent(new Event(EVT));
}
export function getTourVariant(): TourVariant {
  if (typeof window === "undefined") return "full";
  return normalizeVariant(window.sessionStorage.getItem(VKEY));
}
export function setTourVariant(v: TourVariant) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(VKEY, v);
}
export function startTour(variant: TourVariant = "full") {
  setTourVariant(variant);
  setTourIdx(0);
}
export function useTourIdx(): number | null {
  const [idx, setIdx] = useState<number | null>(null);
  useEffect(() => {
    const sync = () => setIdx(getTourIdx());
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  return idx;
}
export function useTourVariant(): TourVariant {
  const [variant, setVariant] = useState<TourVariant>("full");
  useEffect(() => {
    const sync = () => setVariant(getTourVariant());
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  return variant;
}

export interface TourState {
  idx: number;
  variant: TourVariant;
  step: TourStepDef;
  total: number;
}
export function useTourStep(): TourState | null {
  const idx = useTourIdx();
  const variant = useTourVariant();
  // Memoise so the returned object keeps a stable identity across re-renders
  // (it only changes when idx/variant change). Effects that depend on it then
  // fire once per step, not on every render.
  return useMemo<TourState | null>(() => {
    if (idx === null) return null;
    const step = resolveStep(variant, idx);
    if (!step) return null;
    return { idx, variant, step, total: TOUR_PLAYLISTS[variant].length };
  }, [idx, variant]);
}

// --- the overlay (spotlight + tooltip) for a single step --------------------
function TourOverlay({
  step,
  index,
  total,
  canPrev,
  onPrev,
  onNext,
  onClose,
}: {
  step: TourStepDef;
  index: number;
  total: number;
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Tour");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

  // Real tooltip height (it varies with the step text and language); 200 until
  // the first measurement.
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipHeight, setTipHeight] = useState(200);

  const measure = useCallback(() => {
    const el = step.selector ? (document.querySelector(step.selector) as HTMLElement | null) : null;
    setRect(el ? el.getBoundingClientRect() : null);
    if (tipRef.current) setTipHeight(tipRef.current.offsetHeight);
  }, [step.selector]);

  useEffect(() => {
    const recheckIds: ReturnType<typeof setTimeout>[] = [];
    // The target may render only after the step is shown (e.g. the anomaly
    // panel once the results page has its data), so wait for it before
    // scrolling; otherwise the tooltip sits next to an off-screen target.
    const stopWaiting = step.selector
      ? whenElementPresent(step.selector, el => {
          const scrollToTarget = () => {
            // Centre normal targets, but for elements taller than most of the viewport
            // (e.g. the patient table) scroll to their top so the head stays in view
            // instead of the middle.
            const tall = el.getBoundingClientRect().height > window.innerHeight * 0.8;
            el.scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" });
          };
          scrollToTarget();
          measure();
          // Content above the target may still be rendering (the charts right
          // after the data has loaded) and push it out of view again while the
          // smooth scroll runs, so scroll once more if it ended up off-screen.
          for (const ms of [400, 1000, 2000]) {
            recheckIds.push(setTimeout(() => {
              const r = el.getBoundingClientRect();
              if (r.top < 0 || r.top > window.innerHeight * 0.6) scrollToTarget();
            }, ms));
          }
        })
      : () => {};
    // First measurement in the next frame, like the fade-in above.
    const frame = requestAnimationFrame(measure);
    const ids = [setTimeout(measure, 250), setTimeout(measure, 600)];
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      stopWaiting();
      recheckIds.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      ids.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step.selector]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft" && canPrev) onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev, canPrev]);

  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const TW = 352;
  let tipStyle: React.CSSProperties;
  if (rect) {
    const { top, left } = placeTooltip(rect, { width: TW, height: tipHeight }, { width: vw, height: vh });
    tipStyle = {
      position: "fixed", top, left, width: TW,
      opacity: shown ? 1 : 0,
      transition: `top 0.3s ${EASE}, left 0.3s ${EASE}, opacity 0.25s ease`,
    };
  } else {
    tipStyle = {
      position: "fixed", top: "50%", left: "50%", width: TW, transform: "translate(-50%,-50%)",
      opacity: shown ? 1 : 0, transition: "opacity 0.25s ease",
    };
  }

  const isLast = index === total - 1;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("title")}>
      {rect ? (
        <div
          style={{
            position: "fixed",
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + 2 * pad,
            height: rect.height + 2 * pad,
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            border: "2px solid #5fb4e6",
            pointerEvents: "none",
            opacity: shown ? 1 : 0,
            transition: `left 0.3s ${EASE}, top 0.3s ${EASE}, width 0.3s ${EASE}, height 0.3s ${EASE}, opacity 0.25s ease`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      )}

      <div ref={tipRef} style={tipStyle} className="rounded-lg border bg-white dark:bg-neutral-900 shadow-xl p-4 text-sm">
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="font-semibold mb-1 pr-6">{t(step.titleKey)}</div>
        <p className="text-muted-foreground mb-3">{t(step.bodyKey)}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">{index + 1} / {total}</span>
          <div className="flex gap-2">
            {canPrev && (
              <Button size="sm" variant="outline" onClick={onPrev}>{t("back")}</Button>
            )}
            <Button size="sm" onClick={onNext}>{isLast ? t("finish") : t("next")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Per-page tour layer. Renders the current step only while it belongs to this
 * page. Advancing onto a step on another page persists the position and calls
 * `onCrossForward`, which performs the page transition (load data / navigate);
 * the next page resumes automatically.
 */
export function TourLayer({
  page,
  onCrossForward,
}: {
  page: TourPage;
  onCrossForward?: (toIdx: number) => void;
}) {
  const idx = useTourIdx();
  const variant = useTourVariant();
  const playlist = TOUR_PLAYLISTS[variant];
  const active = idx !== null && idx >= 0 && idx < playlist.length;
  const step = active ? STEP_REGISTRY[playlist[idx!]] : null;
  const onThisPage = !!step && step.page === page;

  const close = () => setTourIdx(null);
  const next = () => {
    if (idx === null) return;
    const n = idx + 1;
    if (n >= playlist.length) {
      close();
      return;
    }
    setTourIdx(n);
    if (STEP_REGISTRY[playlist[n]].page !== page) onCrossForward?.(n);
  };
  const prev = () => {
    if (idx === null) return;
    const p = idx - 1;
    if (p < 0 || STEP_REGISTRY[playlist[p]].page !== page) return; // no cross-page back
    setTourIdx(p);
  };
  const canPrev = idx !== null && idx > 0 && STEP_REGISTRY[playlist[idx - 1]]?.page === page;

  if (!onThisPage || !step) return null;
  return (
    <TourOverlay
      step={step}
      index={idx!}
      total={playlist.length}
      canPrev={canPrev}
      onPrev={prev}
      onNext={next}
      onClose={close}
    />
  );
}
