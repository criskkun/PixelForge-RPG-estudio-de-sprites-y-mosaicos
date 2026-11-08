import React from 'react';
import { Layers, Shield, ShieldAlert, Plus, Check } from 'lucide-react';
import { TilesetSheet, TileData, PixelGrid } from '../types';
import { createEmptyGrid } from '../utils/defaultAssets';

interface TilesetStudioProps {
  tileset: TilesetSheet;
  setTileset: React.Dispatch<React.SetStateAction<TilesetSheet>>;
  selectedTileId: string;
  setSelectedTileId: (id: string) => void;
  onEditTileInCanvas: (grid: PixelGrid) => void;
}

export const TilesetStudio: React.FC<TilesetStudioProps> = ({
  tileset,
  setTileset,
  selectedTileId,
  setSelectedTileId,
  onEditTileInCanvas,
}) => {
  const selectedTile = tileset.tiles.find(t => t.id === selectedTileId) || tileset.tiles[0];

  const handleToggleSolid = (tileId: string) => {
    setTileset(prev => ({
      ...prev,
      tiles: prev.tiles.map(t =>
        t.id === tileId ? { ...t, isSolid: !t.isSolid } : t
      ),
    }));
  };

  const handleAddTile = () => {
    const newId = `tile_custom_${Date.now()}`;
    const newTile: TileData = {
      id: newId,
      name: `Tile Personalizado ${tileset.tiles.length + 1}`,
      role: 'single',
      isSolid: false,
      grid: createEmptyGrid(tileset.gridSize),
    };

    setTileset(prev => ({
      ...prev,
      tiles: [...prev.tiles, newTile],
    }));
    setSelectedTileId(newId);
    onEditTileInCanvas(newTile.grid);
  };

  // Helper to render mini pixel canvas thumbnail
  const renderThumbnail = (grid: PixelGrid) => {
    const size = grid.length;
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full pixelated">
        {grid.map((row, r) =>
          row.map((color, c) =>
            color ? (
              <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} />
            ) : null
          )
        )}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Tileset &amp; Reglas Autotile (RPG Top-Down)
            </h3>
            <span className="text-[11px] text-slate-400">
              {tileset.tiles.length} piezas configuradas · Formato 3x3 compatible con Godot TileMapLayer y Unity Rule Tile
            </span>
          </div>
        </div>

        <button
          onClick={handleAddTile}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir Tile</span>
        </button>
      </div>

      {/* Tiles Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tileset.tiles.map(tile => {
          const isSelected = tile.id === selectedTileId;
          return (
            <div
              key={tile.id}
              onClick={() => {
                setSelectedTileId(tile.id);
                onEditTileInCanvas(tile.grid);
              }}
              className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-400 bg-amber-500/10 shadow-md'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-full aspect-square checker-pattern rounded-lg p-1.5 border border-slate-800 flex items-center justify-center overflow-hidden">
                {renderThumbnail(tile.grid)}
              </div>

              {/* Title & Collision Tag */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200 truncate">{tile.name}</span>
              </div>

              {/* Solid Obstacle Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400">
                  {tile.isSolid ? 'Sólido' : 'Transitable'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSolid(tile.id);
                  }}
                  title={tile.isSolid ? 'Colisión activa (bloquea paso)' : 'Piso transitable'}
                  className={`p-1 rounded cursor-pointer ${
                    tile.isSolid
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {tile.isSolid ? <ShieldAlert className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
