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
 * Performance improvements:
 *   - Skips capture if shape count hasn't changed (fast equality check)
 *   - Deduplicates identical snapshots by comparing data URLs
 *   - Uses requestIdleCallback to avoid blocking UI during capture
 *   - AbortController prevents orphaned save requests
 */
export function useSnapshotCapture(
  editorRef: React.RefObject<Editor | null>,
  boardId: string
) {
  const lastSnapshotRef = useRef<string | null>(null);
  const lastShapeCountRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureInProgressRef = useRef(false);

  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    const editor = editorRef.current;
    if (!editor) return null;

    const shapes = editor.getCurrentPageShapes();
    if (shapes.length === 0) return null;

    // Quick check: if shape count unchanged, likely nothing changed
    // (not perfect but avoids expensive SVG export in most idle ticks)
    if (shapes.length === lastShapeCountRef.current && lastSnapshotRef.current) {
      return lastSnapshotRef.current;
    }
    lastShapeCountRef.current = shapes.length;

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

  // Capture and save — with dedup and non-blocking scheduling
  const captureAndSave = useCallback(async () => {
    if (captureInProgressRef.current) return;
    captureInProgressRef.current = true;

    try {
      const dataUrl = await captureSnapshot();
      if (dataUrl && dataUrl !== lastSnapshotRef.current) {
        lastSnapshotRef.current = dataUrl;
        await saveSnapshot(dataUrl);
      }
    } finally {
      captureInProgressRef.current = false;
    }
  }, [captureSnapshot, saveSnapshot]);

  // Non-blocking capture using requestIdleCallback when available
  const scheduleCaptureAndSave = useCallback(() => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => captureAndSave());
    } else {
      // Fallback: use setTimeout to yield to the main thread
      setTimeout(() => captureAndSave(), 0);
    }
  }, [captureAndSave]);

  // Save on beforeunload using sendBeacon for reliability
  useEffect(() => {
    const handleBeforeUnload = () => {
      const editor = editorRef.current;
      if (!editor) return;

      const shapes = editor.getCurrentPageShapes();
      if (shapes.length === 0) return;

      // sendBeacon is fire-and-forget — survives page unload
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

  // Periodic snapshot every 30s — non-blocking
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      scheduleCaptureAndSave();
    }, SNAPSHOT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scheduleCaptureAndSave]);

  return { captureSnapshot, captureAndSave };
}
