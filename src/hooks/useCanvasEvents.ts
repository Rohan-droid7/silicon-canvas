import { useCallback, useRef, useState } from 'react';
import { globalHistory } from '../core/history/historyInstance';
import { clamp, getBBoxHandles, isPointInBBox, isPointInPolygon, normalizeBox } from '../core/math/geometry';
import { TransformMatrix } from '../core/math/transformMatrix';
import { useCanvasStore } from '../store/useCanvasStore';
import { BoundingBoxAnnotation, PolygonAnnotation } from '../types/annotation';
import { HandlePosition, Point2D } from '../types/canvas';

interface DragContext {
  mode: 'NONE' | 'PAN' | 'DRAW_BOX' | 'MOVE_BOX' | 'RESIZE_BOX' | 'MOVE_POLY_VERTEX';
  startScreen: Point2D;
  startNorm: Point2D;
  initialTransform?: { translateX: number; translateY: number };
  activeHandle?: HandlePosition;
  activeVertexIndex?: number;
  initialBox?: BoundingBoxAnnotation;
  initialPolygon?: PolygonAnnotation;
}

export function useCanvasEvents(containerRef: React.RefObject<HTMLDivElement | null>) {
  const {
    transform,
    setTransform,
    activeTool,
    setActiveTool,
    annotations,
    selectedAnnotationId,
    setSelectedId,
    setHoveredId,
    activeDefectClass,
    addAnnotation,
    updateAnnotation,
    drawingState,
    setDrawingState,
    imageDimensions,
  } = useCanvasStore();

  const [cursorStyle, setCursorStyle] = useState<string>('default');
  const dragRef = useRef<DragContext>({
    mode: 'NONE',
    startScreen: { x: 0, y: 0 },
    startNorm: { x: 0, y: 0 },
  });
  const isSpacePressedRef = useRef(false);

  const getScreenPoint = useCallback((e: React.PointerEvent | React.WheelEvent): Point2D => {
    if (!containerRef.current) return { x: e.clientX, y: e.clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [containerRef]);

  const getNormPoint = useCallback(
    (screen: Point2D): Point2D => {
      const imgPt = TransformMatrix.screenToImage(screen, transform);
      const w = imageDimensions.width || 1;
      const h = imageDimensions.height || 1;
      return {
        x: clamp(imgPt.x / w, 0, 1),
        y: clamp(imgPt.y / h, 0, 1),
      };
    },
    [transform, imageDimensions]
  );

  // Wheel zoom centered on mouse
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const screenPt = getScreenPoint(e);
      const multiplier = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const next = TransformMatrix.computeZoom(transform, screenPt, multiplier, 0.1, 50.0);
      setTransform(next);
    },
    [getScreenPoint, transform, setTransform]
  );

  // Pointer Down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Primary button or middle button
      const isMiddle = e.button === 1;
      const isLeft = e.button === 0;

      if (!isLeft && !isMiddle) return;

      const screenPt = getScreenPoint(e);
      const normPt = getNormPoint(screenPt);

      // Capture pointer for smooth dragging outside canvas
      e.currentTarget.setPointerCapture(e.pointerId);

      // Pan mode
      if (isMiddle || isSpacePressedRef.current || activeTool === 'PAN') {
        dragRef.current = {
          mode: 'PAN',
          startScreen: screenPt,
          startNorm: normPt,
          initialTransform: {
            translateX: transform.translateX,
            translateY: transform.translateY,
          },
        };
        setCursorStyle('grabbing');
        return;
      }

      // Box creation tool
      if (activeTool === 'BOX') {
        dragRef.current = {
          mode: 'DRAW_BOX',
          startScreen: screenPt,
          startNorm: normPt,
        };
        setDrawingState({
          tool: 'BOX',
          points: [normPt, normPt],
        });
        return;
      }

      // Polygon creation tool
      if (activeTool === 'POLYGON') {
        if (!drawingState || drawingState.tool !== 'POLYGON') {
          // Start new polygon
          setDrawingState({
            tool: 'POLYGON',
            points: [normPt],
            cursorPoint: normPt,
          });
        } else {
          // Check snap to first vertex (close polygon)
          const firstPt = drawingState.points[0];
          const imgW = imageDimensions.width || 1;
          const imgH = imageDimensions.height || 1;
          const firstScreen = {
            x: firstPt.x * imgW * transform.scale + transform.translateX,
            y: firstPt.y * imgH * transform.scale + transform.translateY,
          };
          const distToFirst = Math.hypot(screenPt.x - firstScreen.x, screenPt.y - firstScreen.y);

          if (drawingState.points.length >= 3 && distToFirst <= 12) {
            // Close polygon and commit
            globalHistory.push(annotations);
            const newPoly: PolygonAnnotation = {
              id: crypto.randomUUID(),
              type: 'POLYGON',
              classType: activeDefectClass,
              confidence: 0.96,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              points: drawingState.points,
            };
            addAnnotation(newPoly);
            setDrawingState(null);
          } else {
            // Add vertex
            setDrawingState({
              ...drawingState,
              points: [...drawingState.points, normPt],
            });
          }
        }
        return;
      }

      // SELECT tool: handle selection, handle dragging, vertex dragging
      if (activeTool === 'SELECT') {
        const imgW = imageDimensions.width || 1;
        const imgH = imageDimensions.height || 1;

        // 1. Check if clicked a handle on the currently selected bounding box
        if (selectedAnnotationId) {
          const selected = annotations.find((a) => a.id === selectedAnnotationId);
          if (selected && selected.type === 'BBOX') {
            const handles = getBBoxHandles(selected);
            for (const h of handles) {
              const hScreen = {
                x: h.point.x * imgW * transform.scale + transform.translateX,
                y: h.point.y * imgH * transform.scale + transform.translateY,
              };
              if (Math.hypot(screenPt.x - hScreen.x, screenPt.y - hScreen.y) <= 8) {
                globalHistory.push(annotations);
                dragRef.current = {
                  mode: 'RESIZE_BOX',
                  startScreen: screenPt,
                  startNorm: normPt,
                  activeHandle: h.position,
                  initialBox: { ...selected },
                };
                return;
              }
            }
          } else if (selected && selected.type === 'POLYGON') {
            // Check if clicked a polygon vertex
            for (let i = 0; i < selected.points.length; i++) {
              const v = selected.points[i];
              const vScreen = {
                x: v.x * imgW * transform.scale + transform.translateX,
                y: v.y * imgH * transform.scale + transform.translateY,
              };
              if (Math.hypot(screenPt.x - vScreen.x, screenPt.y - vScreen.y) <= 8) {
                globalHistory.push(annotations);
                dragRef.current = {
                  mode: 'MOVE_POLY_VERTEX',
                  startScreen: screenPt,
                  startNorm: normPt,
                  activeVertexIndex: i,
                  initialPolygon: { ...selected },
                };
                return;
              }
            }
          }
        }

        // 2. Check if clicked inside any annotation (top-to-bottom search)
        for (let i = annotations.length - 1; i >= 0; i--) {
          const ann = annotations[i];
          let hit = false;
          if (ann.type === 'BBOX') {
            hit = isPointInBBox(normPt, ann);
          } else if (ann.type === 'POLYGON') {
            hit = isPointInPolygon(normPt, ann.points);
          }

          if (hit) {
            setSelectedId(ann.id);
            if (ann.type === 'BBOX') {
              globalHistory.push(annotations);
              dragRef.current = {
                mode: 'MOVE_BOX',
                startScreen: screenPt,
                startNorm: normPt,
                initialBox: { ...ann },
              };
              setCursorStyle('move');
            }
            return;
          }
        }

        // 3. Clicked empty space -> deselect
        setSelectedId(null);
      }
    },
    [
      getScreenPoint,
      getNormPoint,
      activeTool,
      transform,
      selectedAnnotationId,
      annotations,
      imageDimensions,
      drawingState,
      activeDefectClass,
      addAnnotation,
      setDrawingState,
      setSelectedId,
    ]
  );

  // Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const screenPt = getScreenPoint(e);
      const normPt = getNormPoint(screenPt);
      const drag = dragRef.current;

      // Update cursor for polygon preview line
      if (activeTool === 'POLYGON' && drawingState?.tool === 'POLYGON') {
        setDrawingState({
          ...drawingState,
          cursorPoint: normPt,
        });
      }

      // Handle active drag operations
      if (drag.mode === 'PAN' && drag.initialTransform) {
        const dx = screenPt.x - drag.startScreen.x;
        const dy = screenPt.y - drag.startScreen.y;
        setTransform({
          translateX: drag.initialTransform.translateX + dx,
          translateY: drag.initialTransform.translateY + dy,
        });
        return;
      }

      if (drag.mode === 'DRAW_BOX') {
        setDrawingState({
          tool: 'BOX',
          points: [drag.startNorm, normPt],
        });
        return;
      }

      if (drag.mode === 'MOVE_BOX' && drag.initialBox && selectedAnnotationId) {
        const dx = normPt.x - drag.startNorm.x;
        const dy = normPt.y - drag.startNorm.y;
        const newX = clamp(drag.initialBox.x + dx, 0, 1 - drag.initialBox.width);
        const newY = clamp(drag.initialBox.y + dy, 0, 1 - drag.initialBox.height);

        updateAnnotation(selectedAnnotationId, (a) =>
          a.type === 'BBOX' ? { ...a, x: newX, y: newY, updatedAt: Date.now() } : a
        );
        return;
      }

      if (drag.mode === 'RESIZE_BOX' && drag.initialBox && drag.activeHandle && selectedAnnotationId) {
        const init = drag.initialBox;
        let x1 = init.x;
        let y1 = init.y;
        let x2 = init.x + init.width;
        let y2 = init.y + init.height;

        const h = drag.activeHandle;
        if (h.includes('W')) x1 = normPt.x;
        if (h.includes('E')) x2 = normPt.x;
        if (h.includes('N')) y1 = normPt.y;
        if (h.includes('S')) y2 = normPt.y;

        const norm = normalizeBox({ x: x1, y: y1 }, { x: x2, y: y2 });
        updateAnnotation(selectedAnnotationId, (a) =>
          a.type === 'BBOX' ? { ...a, ...norm, updatedAt: Date.now() } : a
        );
        return;
      }

      if (drag.mode === 'MOVE_POLY_VERTEX' && drag.initialPolygon && drag.activeVertexIndex !== undefined && selectedAnnotationId) {
        const updatedPoints = [...drag.initialPolygon.points];
        updatedPoints[drag.activeVertexIndex] = normPt;

        updateAnnotation(selectedAnnotationId, (a) =>
          a.type === 'POLYGON' ? { ...a, points: updatedPoints, updatedAt: Date.now() } : a
        );
        return;
      }

      // Cursor hover updates when not dragging
      if (drag.mode === 'NONE') {
        if (isSpacePressedRef.current || activeTool === 'PAN') {
          setCursorStyle('grab');
          return;
        }

        if (activeTool === 'BOX' || activeTool === 'POLYGON') {
          setCursorStyle('crosshair');
          return;
        }

        if (activeTool === 'SELECT') {
          const imgW = imageDimensions.width || 1;
          const imgH = imageDimensions.height || 1;

          // Check handle hover on selected
          if (selectedAnnotationId) {
            const selected = annotations.find((a) => a.id === selectedAnnotationId);
            if (selected && selected.type === 'BBOX') {
              const handles = getBBoxHandles(selected);
              for (const h of handles) {
                const hScreen = {
                  x: h.point.x * imgW * transform.scale + transform.translateX,
                  y: h.point.y * imgH * transform.scale + transform.translateY,
                };
                if (Math.hypot(screenPt.x - hScreen.x, screenPt.y - hScreen.y) <= 8) {
                  const cursors: Record<HandlePosition, string> = {
                    NW: 'nwse-resize',
                    SE: 'nwse-resize',
                    NE: 'nesw-resize',
                    SW: 'nesw-resize',
                    N: 'ns-resize',
                    S: 'ns-resize',
                    E: 'ew-resize',
                    W: 'ew-resize',
                  };
                  setCursorStyle(cursors[h.position]);
                  return;
                }
              }
            } else if (selected && selected.type === 'POLYGON') {
              for (const v of selected.points) {
                const vScreen = {
                  x: v.x * imgW * transform.scale + transform.translateX,
                  y: v.y * imgH * transform.scale + transform.translateY,
                };
                if (Math.hypot(screenPt.x - vScreen.x, screenPt.y - vScreen.y) <= 8) {
                  setCursorStyle('pointer');
                  return;
                }
              }
            }
          }

          // Check body hover
          let hovered: string | null = null;
          for (let i = annotations.length - 1; i >= 0; i--) {
            const ann = annotations[i];
            if (
              (ann.type === 'BBOX' && isPointInBBox(normPt, ann)) ||
              (ann.type === 'POLYGON' && isPointInPolygon(normPt, ann.points))
            ) {
              hovered = ann.id;
              break;
            }
          }

          setHoveredId(hovered);
          if (hovered) {
            setCursorStyle('move');
          } else {
            setCursorStyle('default');
          }
        }
      }
    },
    [
      getScreenPoint,
      getNormPoint,
      activeTool,
      drawingState,
      selectedAnnotationId,
      annotations,
      transform,
      imageDimensions,
      setDrawingState,
      setTransform,
      updateAnnotation,
      setHoveredId,
    ]
  );

  // Pointer Up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const screenPt = getScreenPoint(e);
      const normPt = getNormPoint(screenPt);

      // Release capture
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (drag.mode === 'DRAW_BOX') {
        const imgW = imageDimensions.width || 1;
        const imgH = imageDimensions.height || 1;
        const box = normalizeBox(drag.startNorm, normPt);

        // Minimum dimension constraint (>= 4px in image space)
        if (box.width * imgW >= 4 && box.height * imgH >= 4) {
          globalHistory.push(annotations);
          const newBox: BoundingBoxAnnotation = {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: activeDefectClass,
            confidence: 0.98,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...box,
          };
          addAnnotation(newBox);
        }
        setDrawingState(null);
      }

      dragRef.current = {
        mode: 'NONE',
        startScreen: { x: 0, y: 0 },
        startNorm: { x: 0, y: 0 },
      };

      setCursorStyle(
        isSpacePressedRef.current || activeTool === 'PAN'
          ? 'grab'
          : activeTool === 'SELECT'
          ? 'default'
          : 'crosshair'
      );
    },
    [
      getScreenPoint,
      getNormPoint,
      imageDimensions,
      annotations,
      activeDefectClass,
      addAnnotation,
      setDrawingState,
      activeTool,
    ]
  );

  return {
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cursorStyle,
    isSpacePressedRef,
  };
}
