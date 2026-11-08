import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PixelGrid, EditorTool } from '../types';
import { cloneGrid } from '../utils/defaultAssets';

interface PixelCanvasProps {
  grid: PixelGrid;
  onChange: (newGrid: PixelGrid) => void;
  tool: EditorTool;
  activeColor: string;
  setActiveColor: (color: string) => void;
  zoom: number; // e.g. 12 = 12px per pixel
  showGrid: boolean;
  onionSkinGrid?: PixelGrid | null;
  showOnionSkin: boolean;
}

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const currentGridRef = useRef<PixelGrid>(grid);

  currentGridRef.current = grid;
  const size = grid.length;

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
        const color = grid[r][c];
        if (color && color !== '') {
          ctx.fillStyle = color;
          ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
        }
      }
    }

    // 3. Draw Grid Lines if enabled and zoom >= 6
    if (showGrid && zoom >= 6) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= size; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * zoom + 0.5, 0);
        ctx.lineTo(i * zoom + 0.5, size * zoom);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * zoom + 0.5);
        ctx.lineTo(size * zoom, i * zoom + 0.5);
        ctx.stroke();
      }
    }

    // 4. Draw Line preview if in line tool and drawing
    if (tool === 'line' && lineStart && hoverCoords) {
      ctx.fillStyle = activeColor;
      const pts = getBresenhamLine(lineStart.x, lineStart.y, hoverCoords.x, hoverCoords.y);
      for (const pt of pts) {
        if (pt.x >= 0 && pt.x < size && pt.y >= 0 && pt.y < size) {
          ctx.fillRect(pt.x * zoom, pt.y * zoom, zoom, zoom);
        }
      }
    }

    // 5. Draw Hover indicator outline
    if (hoverCoords && hoverCoords.x >= 0 && hoverCoords.x < size && hoverCoords.y >= 0 && hoverCoords.y < size) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoverCoords.x * zoom + 0.5, hoverCoords.y * zoom + 0.5, zoom - 1, zoom - 1);
    }
  }, [grid, onionSkinGrid, showOnionSkin, showGrid, zoom, size, tool, lineStart, hoverCoords, activeColor]);

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

  // Bresenham line algorithm for continuous drawing and line tool
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

  const applyPixelTool = (x: number, y: number, targetGrid: PixelGrid) => {
    if (tool === 'pencil') {
      targetGrid[y][x] = activeColor;
    } else if (tool === 'eraser') {
      targetGrid[y][x] = '';
    } else if (tool === 'dither') {
      // Checkerboard dither
      if ((x + y) % 2 === 0) {
        targetGrid[y][x] = activeColor;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGridCoords(e);
    if (!coords) return;

    if (tool === 'picker') {
      const picked = currentGridRef.current[coords.y][coords.x];
      if (picked) setActiveColor(picked);
      return;
    }

    if (tool === 'bucket') {
      const targetColor = currentGridRef.current[coords.y][coords.x];
      floodFill(coords.x, coords.y, targetColor, activeColor);
      return;
    }

    if (tool === 'line') {
      setLineStart(coords);
      setIsDrawing(true);
      return;
    }

    // Normal drawing
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

    if (tool === 'line') {
      redraw();
      return;
    }

    const newGrid = cloneGrid(currentGridRef.current);
    if (lastPos) {
      // Draw smooth line between lastPos and coords
      const points = getBresenhamLine(lastPos.x, lastPos.y, coords.x, coords.y);
      for (const pt of points) {
        if (pt.x >= 0 && pt.x < size && pt.y >= 0 && pt.y < size) {
          applyPixelTool(pt.x, pt.y, newGrid);
        }
      }
    } else {
      applyPixelTool(coords.x, coords.y, newGrid);
    }

    setLastPos(coords);
    onChange(newGrid);
  };

  const handleMouseUp = () => {
    if (isDrawing && tool === 'line' && lineStart && hoverCoords) {
      const newGrid = cloneGrid(currentGridRef.current);
      const points = getBresenhamLine(lineStart.x, lineStart.y, hoverCoords.x, hoverCoords.y);
      for (const pt of points) {
        if (pt.x >= 0 && pt.x < size && pt.y >= 0 && pt.y < size) {
          newGrid[pt.y][pt.x] = activeColor;
        }
      }
      onChange(newGrid);
    }

    setIsDrawing(false);
    setLastPos(null);
    setLineStart(null);
  };

  return (
    <div className="flex flex-col items-center justify-center relative p-6 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
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
