import React from 'react';
import { 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Pipette, 
  Slash, 
  Grid, 
  Eye, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Sparkles,
  FlipHorizontal,
  Trash2
} from 'lucide-react';
import { EditorTool, PalettePreset, RenderStyle } from '../types';
import { RPG_PALETTES } from '../utils/palettes';

interface ToolbarProps {
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  palette: PalettePreset;
  setPalette: (palette: PalettePreset) => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean | ((prev: boolean) => boolean)) => void;
  showOnionSkin: boolean;
  setShowOnionSkin: (show: boolean | ((prev: boolean) => boolean)) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onFlipH: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  activeColor,
  setActiveColor,
  palette,
  setPalette,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  showOnionSkin,
  setShowOnionSkin,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onFlipH,
}) => {
  const tools: { id: EditorTool; label: string; icon: React.ReactNode }[] = [
    { id: 'pencil', label: 'Lápiz (P)', icon: <Pencil className="w-4 h-4" /> },
    { id: 'eraser', label: 'Borrador (E)', icon: <Eraser className="w-4 h-4" /> },
    { id: 'bucket', label: 'Relleno (B)', icon: <PaintBucket className="w-4 h-4" /> },
    { id: 'picker', label: 'Gotero (I)', icon: <Pipette className="w-4 h-4" /> },
    { id: 'line', label: 'Línea (L)', icon: <Slash className="w-4 h-4" /> },
    { id: 'dither', label: 'Pincel Tramado (D)', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-4 p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 shadow-lg">
      {/* Tool Buttons */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Herramientas
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                tool === t.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Undo, Redo, Flip, Clear */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Edición
        </span>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className="flex items-center justify-center p-2 bg-slate-800/80 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className="flex items-center justify-center p-2 bg-slate-800/80 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFlipH}
            title="Voltear Horizontal"
            className="flex items-center justify-center p-2 bg-slate-800/80 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClear}
            title="Limpiar Cuadro"
            className="flex items-center justify-center p-2 bg-rose-950/40 border border-rose-800/40 rounded-lg hover:bg-rose-900/50 text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* View & Canvas Toggles */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Visualización
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs rounded-lg transition-colors cursor-pointer ${
              showGrid
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Rejilla</span>
          </button>
          <button
            onClick={() => setShowOnionSkin(prev => !prev)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs rounded-lg transition-colors cursor-pointer ${
              showOnionSkin
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Papel Cebolla</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-between p-1 bg-slate-800/60 rounded-lg border border-slate-800 text-xs mt-1">
          <button
            onClick={() => setZoom(prev => Math.max(4, prev - 2))}
            title="Reducir Zoom"
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-amber-300 font-semibold">{zoom * 100}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(24, prev + 2))}
            title="Aumentar Zoom"
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Palette Selector */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Paleta RPG
          </span>
          <select
            value={palette.id}
            onChange={(e) => {
              const selected = RPG_PALETTES.find(p => p.id === e.target.value);
              if (selected) setPalette(selected);
            }}
            className="text-xs bg-slate-800 text-amber-300 border border-slate-700 rounded px-2 py-1 outline-none cursor-pointer"
          >
            {RPG_PALETTES.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Active Color Preview & Color Swatches */}
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-8 h-8 rounded-lg border-2 border-white shadow-inner shrink-0"
            style={{ backgroundColor: activeColor || '#ffffff' }}
            title={`Color Activo: ${activeColor}`}
          />
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-mono font-medium text-slate-200">
              {activeColor.toUpperCase() || '#FFFFFF'}
            </span>
            <span className="text-[10px] text-slate-400">{palette.era}</span>
          </div>
        </div>

        {/* Color Swatch Grid */}
        <div className="grid grid-cols-7 gap-1 mt-2 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-lg border border-slate-800">
          {palette.colors.map(c => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              style={{ backgroundColor: c }}
              title={c}
              className={`w-5 h-5 rounded transition-transform cursor-pointer ${
                activeColor.toLowerCase() === c.toLowerCase()
                  ? 'scale-110 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 z-10'
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
