import React, { useState } from 'react';
import { 
  Layers as LayersIcon, 
  Palette as PaletteIcon, 
  Film, 
  Sliders, 
  Plus, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Copy, 
  Trash2, 
  ArrowDownToLine, 
  ChevronUp, 
  ChevronDown,
  Sparkles,
  Pipette,
  Check
} from 'lucide-react';
import { Layer, PalettePreset, GridSize } from '../types';
import { RPG_PALETTES } from '../utils/palettes';
import { createEmptyGrid, cloneGrid } from '../utils/defaultAssets';

interface RightPanelProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  palette: PalettePreset;
  setPalette: (p: PalettePreset) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  recentColors: string[];
  gridSize: GridSize;
  brushSize: number;
  setBrushSize: (size: number) => void;
  symmetryX: boolean;
  setSymmetryX: React.Dispatch<React.SetStateAction<boolean>>;
  symmetryY: boolean;
  setSymmetryY: React.Dispatch<React.SetStateAction<boolean>>;
  ditherPattern: 'none' | 'bayer' | 'check' | 'diagonal';
  setDitherPattern: (pat: 'none' | 'bayer' | 'check' | 'diagonal') => void;
  onExtractPaletteFromImage: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  layers,
  setLayers,
  activeLayerId,
  setActiveLayerId,
  palette,
  setPalette,
  activeColor,
  setActiveColor,
  recentColors,
  gridSize,
  brushSize,
  setBrushSize,
  symmetryX,
  setSymmetryX,
  symmetryY,
  setSymmetryY,
  ditherPattern,
  setDitherPattern,
  onExtractPaletteFromImage,
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'colors' | 'tools'>('layers');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameInput, setLayerNameInput] = useState('');

  // 1. LAYER OPERATIONS
  const handleAddLayer = () => {
    const newId = `layer_${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `Capa ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      grid: createEmptyGrid(gridSize),
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newId);
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      const remaining = layers.filter(l => l.id !== id);
      setActiveLayerId(remaining[remaining.length - 1].id);
    }
  };

  const handleDuplicateLayer = (id: string) => {
    const target = layers.find(l => l.id === id);
    if (!target) return;
    const newId = `layer_${Date.now()}`;
    const dup: Layer = {
      ...target,
      id: newId,
      name: `${target.name} (copia)`,
      grid: cloneGrid(target.grid),
    };
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
    setActiveLayerId(newId);
  };

  const handleToggleVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleToggleLock = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx < layers.length - 1) {
      const next = [...layers];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      setLayers(next);
    } else if (direction === 'down' && idx > 0) {
      const next = [...layers];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      setLayers(next);
    }
  };

  const handleMergeDown = (id: string) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx <= 0) return; // Cannot merge bottom layer

    const top = layers[idx];
    const bottom = layers[idx - 1];
    const mergedGrid = cloneGrid(bottom.grid);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const topColor = top.grid[r]?.[c];
        if (topColor && topColor !== '') {
          mergedGrid[r][c] = topColor;
        }
      }
    }

    const next = [...layers];
    next.splice(idx - 1, 2, {
      ...bottom,
      name: `${bottom.name} + ${top.name}`,
      grid: mergedGrid,
    });
    setLayers(next);
    setActiveLayerId(bottom.id);
  };

  return (
    <aside className="w-72 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Panel Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/60 p-1">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-slate-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          <span>Capas ({layers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('colors')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'colors'
              ? 'bg-slate-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PaletteIcon className="w-3.5 h-3.5" />
          <span>Colores</span>
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tools'
              ? 'bg-slate-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Ajustes</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. LAYERS TAB */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pila de Capas
              </span>
              <button
                onClick={handleAddLayer}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Nueva Capa</span>
              </button>
            </div>

            {/* Layers List (Rendered Top-to-Bottom, reverse order of index) */}
            <div className="space-y-1.5">
              {[...layers].reverse().map((layer) => {
                const isActive = layer.id === activeLayerId;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/90 border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Visibility & Lock */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVisibility(layer.id);
                          }}
                          className={`p-1 rounded hover:bg-slate-700 text-slate-400 cursor-pointer ${
                            !layer.visible ? 'text-slate-600' : 'text-slate-200'
                          }`}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(layer.id);
                          }}
                          className={`p-1 rounded hover:bg-slate-700 text-slate-400 cursor-pointer ${
                            layer.locked ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Layer Name */}
                      <div className="flex-1 min-w-0 px-1">
                        {editingLayerId === layer.id ? (
                          <input
                            type="text"
                            value={layerNameInput}
                            autoFocus
                            onBlur={() => {
                              setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: layerNameInput || l.name } : l));
                              setEditingLayerId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: layerNameInput || l.name } : l));
                                setEditingLayerId(null);
                              }
                            }}
                            onChange={(e) => setLayerNameInput(e.target.value)}
                            className="w-full px-1 py-0.5 bg-slate-950 border border-amber-400 rounded text-xs text-white outline-none"
                          />
                        ) : (
                          <p
                            onDoubleClick={() => {
                              setEditingLayerId(layer.id);
                              setLayerNameInput(layer.name);
                            }}
                            title="Doble clic para renombrar"
                            className="text-xs font-medium text-slate-200 truncate"
                          >
                            {layer.name}
                          </p>
                        )}
                      </div>

                      {/* Layer Action Icons (Move up/down, duplicate, merge down, delete) */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveLayer(layer.id, 'up');
                          }}
                          title="Mover arriba"
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveLayer(layer.id, 'down');
                          }}
                          title="Mover abajo"
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateLayer(layer.id);
                          }}
                          title="Duplicar capa"
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMergeDown(layer.id);
                          }}
                          title="Fusionar hacia abajo"
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLayer(layer.id);
                          }}
                          disabled={layers.length <= 1}
                          title="Eliminar capa"
                          className="p-1 text-slate-500 hover:text-rose-400 rounded disabled:opacity-20 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Opacity Slider */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/40 text-[10px] text-slate-400">
                      <span>Opacidad:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="flex-1 accent-amber-400 h-1.5 cursor-pointer"
                      />
                      <span className="font-mono w-7 text-right">{Math.round(layer.opacity * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. COLORS TAB */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            {/* Active Color Preview & Hex input */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Color Activo
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={activeColor || '#ffffff'}
                  onChange={(e) => setActiveColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none outline-none"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={activeColor.toUpperCase()}
                    onChange={(e) => setActiveColor(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono text-xs text-amber-300 font-bold outline-none"
                  />
                  <span className="text-[10px] text-slate-500">RGBA / Hex</span>
                </div>
              </div>
            </div>

            {/* Palette Switcher & Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Paleta Activa
                </span>
                <select
                  value={palette.id}
                  onChange={(e) => {
                    const sel = RPG_PALETTES.find(p => p.id === e.target.value);
                    if (sel) setPalette(sel);
                  }}
                  className="bg-slate-900 text-xs text-amber-300 border border-slate-700 rounded px-2 py-1 outline-none cursor-pointer"
                >
                  {RPG_PALETTES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Swatch grid */}
              <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                {palette.colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveColor(c)}
                    style={{ backgroundColor: c }}
                    title={c}
                    className={`w-6 h-6 rounded-md transition-transform cursor-pointer ${
                      activeColor.toLowerCase() === c.toLowerCase()
                        ? 'scale-110 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 z-10'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              {/* Extract Palette Button */}
              <button
                onClick={onExtractPaletteFromImage}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Pipette className="w-3.5 h-3.5 text-amber-400" />
                <span>Extraer Colores desde Imagen</span>
              </button>
            </div>

            {/* Recent Colors */}
            {recentColors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Historial de Colores
                </span>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {recentColors.slice(0, 14).map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveColor(c)}
                      style={{ backgroundColor: c }}
                      title={c}
                      className="w-5 h-5 rounded cursor-pointer hover:scale-110 transition-transform"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. TOOLS & ADJUSTMENTS TAB */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            {/* Brush Size */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Tamaño de Píxel / Brocha
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map(sz => (
                  <button
                    key={sz}
                    onClick={() => setBrushSize(sz)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      brushSize === sz
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>

            {/* Symmetry options */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Modo Simetría (Espejo)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSymmetryX(prev => !prev)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    symmetryX
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Simetría X (Horizontal)
                </button>
                <button
                  onClick={() => setSymmetryY(prev => !prev)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    symmetryY
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Simetría Y (Vertical)
                </button>
              </div>
            </div>

            {/* Dithering Style */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Patrón de Tramado (Dithering)
              </span>
              <select
                value={ditherPattern}
                onChange={(e) => setDitherPattern(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="none">Sin Tramado</option>
                <option value="bayer">Matriz Bayer 4x4 (Retro)</option>
                <option value="check">Ajedrez 2x2 (Classic Dither)</option>
                <option value="diagonal">Líneas Diagonales</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
