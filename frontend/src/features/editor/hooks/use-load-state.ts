import { fabric } from "fabric";
import { useEffect, useRef } from "react";

import { JSON_KEYS } from "@/features/editor/types";

interface UseLoadStateProps {
  autoZoom: () => void;
  canvas: fabric.Canvas | null;
  initialState: React.MutableRefObject<string | undefined>;
  canvasHistory: React.MutableRefObject<string[]>;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const useLoadState = ({
  canvas,
  autoZoom,
  initialState,
  canvasHistory,
  setHistoryIndex,
}: UseLoadStateProps) => {
  const initializedCanvas = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvas || initializedCanvas.current === canvas) return;

    if (initialState?.current) {
      initializedCanvas.current = canvas;
      const data = JSON.parse(initialState.current);

      canvas.loadFromJSON(data, () => {
        const currentState = JSON.stringify(canvas.toJSON(JSON_KEYS));

        canvasHistory.current = [currentState];
        setHistoryIndex(0);
        autoZoom();
      });
    } else {
      initializedCanvas.current = canvas;
      autoZoom();
    }
  }, [canvas, autoZoom, initialState, canvasHistory, setHistoryIndex]);
};
