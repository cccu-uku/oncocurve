"use client";

import { X } from "lucide-react";

export interface FilterTagAnzeige {
  id: string;
  label: string;
}

interface FilterTagListeProps {
  tags: FilterTagAnzeige[];
  onRemove: (id: string) => void;
  /** Baut den barrierefreien Namen der Entfernen-Schaltfläche aus dem Tag-Text. */
  removeAriaLabel: (label: string) => string;
}

/**
 * Aktive Filter als Tags, direkt unter dem "Filter"-Titel der Sidebar-Karte.
 * Jeder Tag nennt Kategorie und Wert. Die Entfernen-Schaltfläche ist immer im
 * DOM und per Tab erreichbar, sie erscheint sichtbar erst bei Hover oder
 * Tastaturfokus (Opazität statt display:none), damit Tastaturnutzung nicht
 * ausgeschlossen bleibt. Ohne aktive Filter wird nichts gerendert.
 */
export function FilterTagListe({ tags, onRemove, removeAriaLabel }: FilterTagListeProps) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="group inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
        >
          {tag.label}
          <button
            type="button"
            onClick={() => onRemove(tag.id)}
            aria-label={removeAriaLabel(tag.label)}
            className="rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
