import { Annotation, BoundingBoxAnnotation, DEFECT_CLASS_CONFIG, PolygonAnnotation } from '../../types/annotation';
import { CanvasTransform, DrawingState, Point2D } from '../../types/canvas';
import { getBBoxHandles, isAnnotationVisible } from '../math/geometry';
import { TransformMatrix } from '../math/transformMatrix';

export class VectorLayerRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    screenHeight: number,
    annotations: Annotation[],
    selectedId: string | null,
    hoveredId: string | null,
    drawingState: DrawingState | null,
    transform: CanvasTransform,
    imgWidth: number,
    imgHeight: number,
    activeClassColor = '#ff5252'
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, screenWidth, screenHeight);

    if (imgWidth <= 0 || imgHeight <= 0) {
      ctx.restore();
      return;
    }

    // Viewport bounds in normalized image space for frustum culling (with 200px safety margin)
    const margin = 200;
    const topLeftImg = TransformMatrix.screenToImage({ x: -margin, y: -margin }, transform);
    const botRightImg = TransformMatrix.screenToImage(
      { x: screenWidth + margin, y: screenHeight + margin },
      transform
    );

    const normMinX = Math.min(topLeftImg.x, botRightImg.x) / imgWidth;
    const normMinY = Math.min(topLeftImg.y, botRightImg.y) / imgHeight;
    const normMaxX = Math.max(topLeftImg.x, botRightImg.x) / imgWidth;
    const normMaxY = Math.max(topLeftImg.y, botRightImg.y) / imgHeight;

    // 1. Render all committed annotations
    for (const ann of annotations) {
      // Frustum culling
      if (!isAnnotationVisible(ann, normMinX, normMinY, normMaxX, normMaxY)) {
        continue;
      }

      const isSelected = ann.id === selectedId;
      const isHovered = ann.id === hoveredId;
      const classCfg = DEFECT_CLASS_CONFIG[ann.classType] || {
        displayName: ann.classType,
        color: '#ff5252',
      };
      const baseColor = classCfg.color;

      if (ann.type === 'BBOX') {
        this.renderBBox(
          ctx,
          ann,
          isSelected,
          isHovered,
          baseColor,
          classCfg.displayName,
          transform,
          imgWidth,
          imgHeight
        );
      } else if (ann.type === 'POLYGON') {
        this.renderPolygon(
          ctx,
          ann,
          isSelected,
          isHovered,
          baseColor,
          classCfg.displayName,
          transform,
          imgWidth,
          imgHeight
        );
      }
    }

    // 2. Render in-progress drawing state
    if (drawingState) {
      this.renderDrawingState(
        ctx,
        drawingState,
        activeClassColor,
        transform,
        imgWidth,
        imgHeight
      );
    }

    ctx.restore();
  }

  private static renderBBox(
    ctx: CanvasRenderingContext2D,
    box: BoundingBoxAnnotation,
    isSelected: boolean,
    isHovered: boolean,
    color: string,
    label: string,
    transform: CanvasTransform,
    imgWidth: number,
    imgHeight: number
  ): void {
    const sx = box.x * imgWidth * transform.scale + transform.translateX;
    const sy = box.y * imgHeight * transform.scale + transform.translateY;
    const sw = box.width * imgWidth * transform.scale;
    const sh = box.height * imgHeight * transform.scale;

    // Fill
    ctx.fillStyle = isSelected
      ? this.hexToRgba(color, 0.3)
      : isHovered
      ? this.hexToRgba(color, 0.22)
      : this.hexToRgba(color, 0.14);
    ctx.fillRect(sx, sy, sw, sh);

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
    if (isSelected) {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);

    // Selection Glow
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 1, sy - 1, sw + 2, sh + 2);
      ctx.restore();
    }

    // Label Tag
    this.renderLabelTag(ctx, label, sx, sy, color, box.confidence);

    // Handles if selected
    if (isSelected) {
      const handles = getBBoxHandles(box);
      for (const h of handles) {
        const hx = h.point.x * imgWidth * transform.scale + transform.translateX;
        const hy = h.point.y * imgHeight * transform.scale + transform.translateY;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fillRect(hx - 4.5, hy - 4.5, 9, 9);
        ctx.strokeRect(hx - 4.5, hy - 4.5, 9, 9);
      }
    }
  }

  private static renderPolygon(
    ctx: CanvasRenderingContext2D,
    poly: PolygonAnnotation,
    isSelected: boolean,
    isHovered: boolean,
    color: string,
    label: string,
    transform: CanvasTransform,
    imgWidth: number,
    imgHeight: number
  ): void {
    if (poly.points.length < 3) return;

    ctx.beginPath();
    const firstScreen = {
      x: poly.points[0].x * imgWidth * transform.scale + transform.translateX,
      y: poly.points[0].y * imgHeight * transform.scale + transform.translateY,
    };
    ctx.moveTo(firstScreen.x, firstScreen.y);

    for (let i = 1; i < poly.points.length; i++) {
      const p = poly.points[i];
      const sx = p.x * imgWidth * transform.scale + transform.translateX;
      const sy = p.y * imgHeight * transform.scale + transform.translateY;
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();

    // Fill
    ctx.fillStyle = isSelected
      ? this.hexToRgba(color, 0.3)
      : isHovered
      ? this.hexToRgba(color, 0.22)
      : this.hexToRgba(color, 0.14);
    ctx.fill();

    // Stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
    if (isSelected) {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Selection Glow
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Label tag at first point
    this.renderLabelTag(ctx, label, firstScreen.x, firstScreen.y, color, poly.confidence);

    // If selected, render vertex points and midpoint handles
    if (isSelected) {
      for (let i = 0; i < poly.points.length; i++) {
        const pt = poly.points[i];
        const sx = pt.x * imgWidth * transform.scale + transform.translateX;
        const sy = pt.y * imgHeight * transform.scale + transform.translateY;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Edge midpoint for insertion
        const nextPt = poly.points[(i + 1) % poly.points.length];
        const mx =
          ((pt.x + nextPt.x) / 2) * imgWidth * transform.scale + transform.translateX;
        const my =
          ((pt.y + nextPt.y) / 2) * imgHeight * transform.scale + transform.translateY;

        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private static renderDrawingState(
    ctx: CanvasRenderingContext2D,
    drawing: DrawingState,
    color: string,
    transform: CanvasTransform,
    imgWidth: number,
    imgHeight: number
  ): void {
    if (drawing.tool === 'BOX' && drawing.points.length >= 2) {
      const p1 = drawing.points[0];
      const p2 = drawing.points[1];

      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      const sx = minX * imgWidth * transform.scale + transform.translateX;
      const sy = minY * imgHeight * transform.scale + transform.translateY;
      const sw = (maxX - minX) * imgWidth * transform.scale;
      const sh = (maxY - minY) * imgHeight * transform.scale;

      ctx.fillStyle = this.hexToRgba(color, 0.2);
      ctx.fillRect(sx, sy, sw, sh);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    } else if (drawing.tool === 'POLYGON' && drawing.points.length > 0) {
      ctx.beginPath();
      const first = drawing.points[0];
      const sx0 = first.x * imgWidth * transform.scale + transform.translateX;
      const sy0 = first.y * imgHeight * transform.scale + transform.translateY;
      ctx.moveTo(sx0, sy0);

      for (let i = 1; i < drawing.points.length; i++) {
        const pt = drawing.points[i];
        const sx = pt.x * imgWidth * transform.scale + transform.translateX;
        const sy = pt.y * imgHeight * transform.scale + transform.translateY;
        ctx.lineTo(sx, sy);
      }

      // Preview line to cursor
      let isSnapNear = false;
      if (drawing.cursorPoint) {
        const curScreen = {
          x: drawing.cursorPoint.x * imgWidth * transform.scale + transform.translateX,
          y: drawing.cursorPoint.y * imgHeight * transform.scale + transform.translateY,
        };

        // Check if cursor is within 8px of first vertex for snap-to-close
        const distToStart = Math.hypot(curScreen.x - sx0, curScreen.y - sy0);
        if (drawing.points.length >= 3 && distToStart <= 12) {
          isSnapNear = true;
          ctx.lineTo(sx0, sy0); // Snap directly to start
        } else {
          ctx.lineTo(curScreen.x, curScreen.y);
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw placed vertices
      for (let i = 0; i < drawing.points.length; i++) {
        const pt = drawing.points[i];
        const sx = pt.x * imgWidth * transform.scale + transform.translateX;
        const sy = pt.y * imgHeight * transform.scale + transform.translateY;

        ctx.fillStyle = i === 0 ? '#00e5ff' : '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw snap pulse on origin vertex if near
      if (isSnapNear) {
        ctx.save();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx0, sy0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private static renderLabelTag(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    bgColor: string,
    confidence: number
  ): void {
    const displayText = `${text} ${Math.round(confidence * 100)}%`;
    ctx.font = '10px "JetBrains Mono", "Consolas", monospace';
    const textWidth = ctx.measureText(displayText).width;
    const tagHeight = 16;
    const tagWidth = textWidth + 10;
    const tagY = y - tagHeight - 4;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, tagY, tagWidth, tagHeight, 3);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.fillText(displayText, x + 5, tagY + 11);
  }

  private static hexToRgba(hex: string, alpha: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
