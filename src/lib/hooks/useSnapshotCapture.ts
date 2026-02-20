"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "tldraw";

const SNAPSHOT_INTERVAL_MS = 30_000; // 30 seconds
const MAX_THUMBNAIL_SIZE = 400; // max width/height in pixels

/**
 * Hook to capture board thumbnails from the tldraw editor.
 *
 * Captures an SVG of all shapes, renders it to a small canvas,
 * and converts to a base64 PNG data URL for storage.
 *
 * Features:
 * - captureSnapshot(): manual capture
 * - Auto-save on beforeunload via navigator.sendBeacon
 * - Periodic save every 30s while the board has content
 */
export function useSnapshotCapture(
  editorRef: React.RefObject<Editor | null>,
  boardId: string
) {
  const lastSnapshotRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    const editor = editorRef.current;
    if (!editor) return null;

    const shapes = editor.getCurrentPageShapes();
    if (shapes.length === 0) return null;

    try {
      // Get all shape IDs for export
      const shapeIds = shapes.map((s) => s.id);

      // Use tldraw's SVG export
      const svgResult = await editor.getSvgString(shapeIds, {
        background: true,
        padding: 16,
      });

      if (!svgResult) return null;

      const { svg: svgString, width, height } = svgResult;

      // Calculate scaled dimensions (fit within MAX_THUMBNAIL_SIZE)
      const scale = Math.min(
        MAX_THUMBNAIL_SIZE / width,
        MAX_THUMBNAIL_SIZE / height,
        1 // don't upscale
      );
      const scaledWidth = Math.round(width * scale);
      const scaledHeight = Math.round(height * scale);

      // Render SVG to canvas
      const canvas = document.createElement("canvas");
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);

      // Create an image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);

      const dataUrl = await new Promise<string | null>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
          URL.revokeObjectURL(url);
          const result = canvas.toDataURL("image/png", 0.8);
          resolve(result);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });

      return dataUrl;
    } catch (err) {
      console.warn("[Snapshot] Failed to capture:", err);
      return null;
    }
  }, [editorRef]);

  // Save snapshot to API
  const saveSnapshot = useCallback(
    async (dataUrl: string) => {
      try {
        await fetch(`/api/boards/${boardId}/snapshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnailDataUrl: dataUrl }),
        });
      } catch (err) {
        console.warn("[Snapshot] Failed to save:", err);
      }
    },
    [boardId]
  );

  // Capture and save (used by periodic + manual triggers)
  const captureAndSave = useCallback(async () => {
    const dataUrl = await captureSnapshot();
    if (dataUrl && dataUrl !== lastSnapshotRef.current) {
      lastSnapshotRef.current = dataUrl;
      await saveSnapshot(dataUrl);
    }
  }, [captureSnapshot, saveSnapshot]);

  // Save on beforeunload using sendBeacon for reliability
  useEffect(() => {
    const handleBeforeUnload = () => {
      const editor = editorRef.current;
      if (!editor) return;

      const shapes = editor.getCurrentPageShapes();
      if (shapes.length === 0) return;

      // sendBeacon is fire-and-forget — survives page unload
      // We use the last captured snapshot since async capture won't complete
      if (lastSnapshotRef.current) {
        const payload = new Blob(
          [JSON.stringify({ thumbnailDataUrl: lastSnapshotRef.current })],
          { type: "application/json" }
        );
        navigator.sendBeacon(`/api/boards/${boardId}/snapshot`, payload);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [boardId, editorRef]);

  // Periodic snapshot every 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      captureAndSave();
    }, SNAPSHOT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [captureAndSave]);

  return { captureSnapshot, captureAndSave };
}
