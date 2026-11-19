"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Event handlers to spread onto an element that can receive a drop. */
export interface DropHandlers {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

/**
 * Drag-and-drop with live feedback. While a card is dragged, each target asks the game rules
 * whether the dragged card(s) could land there:
 *   - legal: the drop is accepted and the target is reported as `hover`, so it can glow
 *   - not legal: the drop is refused, and the browser shows its "not allowed" cursor
 *
 * `Src` is whatever the game uses to describe where the dragged cards came from.
 */
export function useDragDrop<Src>() {
  const source = useRef<Src | null>(null);
  // key of the target currently under the pointer, only while the drop there would be legal
  const [hover, setHover] = useState<string | null>(null);

  // A drag can end anywhere (dropped outside the board, cancelled with Escape): always reset.
  useEffect(() => {
    const end = () => {
      source.current = null;
      setHover(null);
    };
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, []);

  /** Call from onDragStart with where the dragged cards come from. */
  const start = useCallback((src: Src) => {
    source.current = src;
  }, []);

  /**
   * Handlers for one drop target.
   * @param key      stable id for the target, compared against `hover`
   * @param canDrop  would dropping `src` here be legal? (called repeatedly while hovering)
   * @param onDrop   perform the move
   */
  const target = useCallback(
    (key: string, canDrop: (src: Src) => boolean, onDrop: (src: Src) => void): DropHandlers => ({
      onDragOver: (e) => {
        const src = source.current;
        if (src === null) return; // not one of our card drags
        if (canDrop(src)) {
          e.preventDefault(); // accept the drop
          e.dataTransfer.dropEffect = "move";
          setHover(key);
        } else {
          e.dataTransfer.dropEffect = "none";
          setHover((h) => (h === key ? null : h));
        }
      },
      onDragLeave: (e) => {
        // moving between a target's own child elements also fires dragleave; ignore those
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setHover((h) => (h === key ? null : h));
      },
      onDrop: (e) => {
        e.preventDefault();
        const src = source.current;
        source.current = null;
        setHover(null);
        if (src !== null && canDrop(src)) onDrop(src);
      },
    }),
    [],
  );

  return { start, target, hover };
}
