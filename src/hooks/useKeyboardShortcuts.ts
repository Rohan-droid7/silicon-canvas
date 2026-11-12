import { useEffect } from 'react';
import { globalHistory } from '../core/history/historyInstance';
import { useCanvasStore } from '../store/useCanvasStore';
import { PolygonAnnotation } from '../types/annotation';

export function useKeyboardShortcuts(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isSpacePressedRef: React.MutableRefObject<boolean>
) {
  const {
    activeTool,
    setActiveTool,
    annotations,
    selectedAnnotationId,
    deleteAnnotation,
    setSelectedId,
    setAnnotations,
    drawingState,
    setDrawingState,
    activeDefectClass,
    addAnnotation,
    resetTransform,
    setTransform,
    imageDimensions,
  } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Spacebar hold for pan
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const prev = globalHistory.undo(annotations);
        if (prev !== null) {
          setAnnotations(prev);
        }
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
      if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        const next = globalHistory.redo(annotations);
        if (next !== null) {
          setAnnotations(next);
        }
        return;
      }

      // Tool Switching
      if (!isCtrlOrCmd) {
        if (e.key.toLowerCase() === 'b') {
          setActiveTool('BOX');
          return;
        }
        if (e.key.toLowerCase() === 'p') {
          setActiveTool('POLYGON');
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          setActiveTool('SELECT');
          return;
        }

        // Fit to Screen (Key 1)
        if (e.key === '1') {
          e.preventDefault();
          if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            resetTransform(clientWidth, clientHeight);
          }
          return;
        }

        // 1:1 Scale (Key 0)
        if (e.key === '0') {
          e.preventDefault();
          if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            const w = imageDimensions.width;
            const h = imageDimensions.height;
            setTransform({
              scale: 1.0,
              translateX: (clientWidth - w) / 2,
              translateY: (clientHeight - h) / 2,
            });
          }
          return;
        }

        // Delete selected annotation
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedAnnotationId) {
            e.preventDefault();
            globalHistory.push(annotations);
            deleteAnnotation(selectedAnnotationId);
            return;
          }
        }

        // Enter: Close current in-progress polygon
        if (e.key === 'Enter') {
          if (drawingState && drawingState.tool === 'POLYGON' && drawingState.points.length >= 3) {
            e.preventDefault();
            globalHistory.push(annotations);
            const newPoly: PolygonAnnotation = {
              id: crypto.randomUUID(),
              type: 'POLYGON',
              classType: activeDefectClass,
              confidence: 0.95,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              points: drawingState.points,
            };
            addAnnotation(newPoly);
            setDrawingState(null);
            return;
          }
        }

        // Escape: Cancel active drawing or deselect
        if (e.key === 'Escape') {
          e.preventDefault();
          if (drawingState) {
            setDrawingState(null);
          } else {
            setSelectedId(null);
          }
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool,
    setActiveTool,
    annotations,
    selectedAnnotationId,
    deleteAnnotation,
    setSelectedId,
    setAnnotations,
    drawingState,
    setDrawingState,
    activeDefectClass,
    addAnnotation,
    containerRef,
    resetTransform,
    setTransform,
    imageDimensions,
    isSpacePressedRef,
  ]);
}
