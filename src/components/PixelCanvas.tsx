import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PixelGrid, EditorTool } from '../types';
import { cloneGrid } from '../utils/defaultAssets';

interface PixelCanvasProps {
  grid: PixelGrid;
  onChange: (newGrid: PixelGrid) => void;
  tool: EditorTool;
  activeColor: string;
  setActiveColor: (color: string) => void;
  zoom: number;
  showGrid: boolean;
  onionSkinGrid?: PixelGrid | null;
  showOnionSkin: boolean;
  brushSize?: number;
  symmetryX?: boolean;
  symmetryY?: boolean;
  ditherPattern?: 'none' | 'bayer' | 'check' | 'diagonal';
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  grid,
  onChange,
  tool,
  activeColor,
  setActiveColor,
  zoom,
  showGrid,
  onionSkinGrid,
  showOnionSkin,
  brushSize = 1,
  symmetryX = false,
  symmetryY = false,
  ditherPattern = 'none',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const currentGridRef = useRef<PixelGrid>(grid);

  currentGridRef.current = grid;
  const size = grid.length;

  // Bresenham line algorithm
  const getBresenhamLine = (x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;

    while (true) {
      points.push({ x: currX, y: currY });
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }
    return points;
  };

  // Bresenham circle algorithm
  const getCirclePoints = (cx: number, cy: number, r: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;

    const addSymmetric = (px: number, py: number) => {
      points.push({ x: cx + px, y: cy + py });
      points.push({ x: cx - px, y: cy + py });
      points.push({ x: cx + px, y: cy - py });
      points.push({ x: cx - px, y: cy - py });
      points.push({ x: cx + py, y: cy + px });
      points.push({ x: cx - py, y: cy + px });
      points.push({ x: cx + py, y: cy - px });
      points.push({ x: cx - py, y: cy - px });
    };

    while (y >= x) {
      addSymmetric(x, y);
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
    }
    return points;
  };

  // Rectangle points
  const getRectanglePoints = (x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let x = minX; x <= maxX; x++) {
      points.push({ x, y: minY });
      points.push({ x, y: maxY });
    }
    for (let y = minY; y <= maxY; y++) {
      points.push({ x: minX, y });
      points.push({ x: maxX, y });
    }
    return points;
  };

  // Render canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Onion skin if enabled and available
    if (showOnionSkin && onionSkinGrid) {
      ctx.globalAlpha = 0.35;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const color = onionSkinGrid[r]?.[c];
          if (color && color !== '') {
            ctx.fillStyle = color;
            ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // 2. Draw Current Grid Pixels
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const color = grid[r]?.[c];
        if (color && color !== '') {
          ctx.fillStyle = color;
          ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
        }
      }
    }

    // 3. Draw Grid Lines if enabled
    if (showGrid && zoom >= 6) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * zoom + 0.5, 0);
        ctx.lineTo(i * zoom + 0.5, size * zoom);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * zoom + 0.5);
        ctx.lineTo(size * zoom, i * zoom + 0.5);
        ctx.stroke();
      }
    }

    // 4. Symmetry Guide Lines
    if (symmetryX) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, (size / 2) * zoom);
      ctx.lineTo(size * zoom, (size / 2) * zoom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (symmetryY) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo((size / 2) * zoom, 0);
      ctx.lineTo((size / 2) * zoom, size * zoom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw Shape Preview (Line, Rectangle, Circle)
    if (isDrawing && shapeStart && hoverCoords) {
      ctx.fillStyle = activeColor;
      let previewPts: { x: number; y: number }[] = [];

      if (tool === 'line') {
        previewPts = getBresenhamLine(shapeStart.x, shapeStart.y, hoverCoords.x, hoverCoords.y);
      } else if (tool === 'rectangle') {
        previewPts = getRectanglePoints(shapeStart.x, shapeStart.y, hoverCoords.x, hoverCoords.y);
      } else if (tool === 'circle') {
        const radius = Math.round(Math.sqrt(Math.pow(hoverCoords.x - shapeStart.x, 2) + Math.pow(hoverCoords.y - shapeStart.y, 2)));
        previewPts = getCirclePoints(shapeStart.x, shapeStart.y, radius);
      }

      for (const pt of previewPts) {
        if (pt.x >= 0 && pt.x < size && pt.y >= 0 && pt.y < size) {
          ctx.fillRect(pt.x * zoom, pt.y * zoom, zoom, zoom);
        }
      }
    }

    // 6. Draw Hover indicator outline
    if (hoverCoords && hoverCoords.x >= 0 && hoverCoords.x < size && hoverCoords.y >= 0 && hoverCoords.y < size) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      const bW = brushSize * zoom;
      ctx.strokeRect(hoverCoords.x * zoom + 0.5, hoverCoords.y * zoom + 0.5, bW - 1, bW - 1);
    }
  }, [grid, onionSkinGrid, showOnionSkin, showGrid, zoom, size, tool, shapeStart, hoverCoords, activeColor, brushSize, symmetryX, symmetryY, isDrawing]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Convert client coordinate to grid (x, y)
  const getGridCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor(clientX / zoom);
    const y = Math.floor(clientY / zoom);

    if (x < 0 || x >= size || y < 0 || y >= size) return null;
    return { x, y };
  };

  // Breadth-First-Search Flood Fill
  const floodFill = (startX: number, startY: number, targetColor: string, fillColor: string) => {
    if (targetColor === fillColor) return;
    const newGrid = cloneGrid(currentGridRef.current);
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      if (newGrid[y][x] !== targetColor) continue;

      newGrid[y][x] = fillColor;

      queue.push([x + 1, y]);
      queue.push([x - 1, y]);
      queue.push([x, y + 1]);
      queue.push([x, y - 1]);
    }

    onChange(newGrid);
  };

  const applySinglePixel = (x: number, y: number, targetGrid: PixelGrid) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;

    if (tool === 'pencil' || tool === 'brush') {
      targetGrid[y][x] = activeColor;
    } else if (tool === 'eraser') {
      targetGrid[y][x] = '';
    } else if (tool === 'dither') {
      if (ditherPattern === 'bayer') {
        if (BAYER_4X4[y % 4][x % 4] < 8) targetGrid[y][x] = activeColor;
      } else if (ditherPattern === 'diagonal') {
        if ((x + y) % 3 === 0) targetGrid[y][x] = activeColor;
      } else {
        // Default 2x2 check
        if ((x + y) % 2 === 0) targetGrid[y][x] = activeColor;
      }
    }
  };

  const applyPixelTool = (cx: number, cy: number, targetGrid: PixelGrid) => {
    const coordsToApply: { x: number; y: number }[] = [];

    // Apply with brush size
    for (let ox = 0; ox < brushSize; ox++) {
      for (let oy = 0; oy < brushSize; oy++) {
        const px = cx + ox;
        const py = cy + oy;
        coordsToApply.push({ x: px, y: py });

        // Symmetry X (vertical mirror)
        if (symmetryX) {
          coordsToApply.push({ x: px, y: size - 1 - py });
        }
        // Symmetry Y (horizontal mirror)
        if (symmetryY) {
          coordsToApply.push({ x: size - 1 - px, y: py });
        }
        // Dual symmetry
        if (symmetryX && symmetryY) {
          coordsToApply.push({ x: size - 1 - px, y: size - 1 - py });
        }
      }
    }

    for (const pt of coordsToApply) {
      applySinglePixel(pt.x, pt.y, targetGrid);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e);
    if (!coords) return;

    if (tool === 'picker') {
      const picked = currentGridRef.current[coords.y]?.[coords.x];
      if (picked) setActiveColor(picked);
      return;
    }

    if (tool === 'bucket') {
      const targetColor = currentGridRef.current[coords.y]?.[coords.x];
      floodFill(coords.x, coords.y, targetColor, activeColor);
      return;
    }

    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      setShapeStart(coords);
      setIsDrawing(true);
      return;
    }

    // Normal drawing (pencil, brush, eraser, dither)
    setIsDrawing(true);
    setLastPos(coords);
    const newGrid = cloneGrid(currentGridRef.current);
    applyPixelTool(coords.x, coords.y, newGrid);
    onChange(newGrid);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e);
    setHoverCoords(coords);

    if (!isDrawing || !coords) return;

    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      redraw();
      return;
    }

    const newGrid = cloneGrid(currentGridRef.current);
    if (lastPos) {
      const points = getBresenhamLine(lastPos.x, lastPos.y, coords.x, coords.y);
      for (const pt of points) {
        applyPixelTool(pt.x, pt.y, newGrid);
      }
    } else {
      applyPixelTool(coords.x, coords.y, newGrid);
    }

    setLastPos(coords);
    onChange(newGrid);
  };

  const handleMouseUp = () => {
    if (isDrawing && shapeStart && hoverCoords) {
      const newGrid = cloneGrid(currentGridRef.current);
      let pts: { x: number; y: number }[] = [];

      if (tool === 'line') {
        pts = getBresenhamLine(shapeStart.x, shapeStart.y, hoverCoords.x, hoverCoords.y);
      } else if (tool === 'rectangle') {
        pts = getRectanglePoints(shapeStart.x, shapeStart.y, hoverCoords.x, hoverCoords.y);
      } else if (tool === 'circle') {
        const radius = Math.round(Math.sqrt(Math.pow(hoverCoords.x - shapeStart.x, 2) + Math.pow(hoverCoords.y - shapeStart.y, 2)));
        pts = getCirclePoints(shapeStart.x, shapeStart.y, radius);
      }

      for (const pt of pts) {
        applyPixelTool(pt.x, pt.y, newGrid);
      }

      if (pts.length > 0) {
        onChange(newGrid);
      }
    }

    setIsDrawing(false);
    setLastPos(null);
    setShapeStart(null);
  };

  return (
    <div className="flex flex-col items-center justify-center relative p-6 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* Canvas Frame with checkered transparency pattern */}
      <div 
        className="relative checker-pattern rounded-lg shadow-inner border border-slate-700/60 overflow-hidden cursor-crosshair"
        style={{ width: size * zoom, height: size * zoom }}
      >
        <canvas
          ref={canvasRef}
          width={size * zoom}
          height={size * zoom}
          className="pixelated block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setHoverCoords(null);
            handleMouseUp();
          }}
        />
      </div>

      {/* Coordinate & Canvas Info Bar */}
      <div className="flex items-center justify-between w-full max-w-sm mt-3 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>{size}x{size} px</span>
          <span className="text-slate-600">·</span>
          <span>Zoom: {zoom}x</span>
          {brushSize > 1 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400">Brocha: {brushSize}px</span>
            </>
          )}
        </div>
        <div>
          {hoverCoords ? (
            <span className="text-amber-400">X: {hoverCoords.x} Y: {hoverCoords.y}</span>
          ) : (
            <span className="text-slate-600">--</span>
          )}
        </div>
      </div>
    </div>
  );
};
