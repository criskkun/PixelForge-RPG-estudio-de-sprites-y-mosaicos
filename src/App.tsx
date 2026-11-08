import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CharacterSheet, 
  TilesetSheet, 
  PixelGrid, 
  Direction, 
  AnimationType, 
  EditorTool, 
  PalettePreset, 
  RenderStyle, 
  GridSize, 
  AssetType 
} from './types';
import { createDefaultCharacter, createDefaultTileset, cloneGrid, createEmptyGrid } from './utils/defaultAssets';
import { RPG_PALETTES } from './utils/palettes';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { PixelCanvas } from './components/PixelCanvas';
import { AnimationTimeline } from './components/AnimationTimeline';
import { TilesetStudio } from './components/TilesetStudio';
import { ReferenceGenerator } from './components/ReferenceGenerator';
import { PlaytestArena } from './components/PlaytestArena';
import { EngineExportModal } from './components/EngineExportModal';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'character' | 'tileset' | 'generator' | 'playtest'>('character');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Asset States
  const [character, setCharacter] = useState<CharacterSheet>(createDefaultCharacter);
  const [tileset, setTileset] = useState<TilesetSheet>(createDefaultTileset);

  // Character Editor State
  const [currentDirection, setCurrentDirection] = useState<Direction>('down');
  const [currentAnimType, setCurrentAnimType] = useState<AnimationType>('walk');
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  // Tileset Editor State
  const [selectedTileId, setSelectedTileId] = useState<string>('grass_center');

  // Generator Shared Settings
  const [generatorStyle, setGeneratorStyle] = useState<RenderStyle>('16bit-snes');
  const [generatorGridSize, setGeneratorGridSize] = useState<GridSize>(32);
  const [generatorAssetType, setAssetType] = useState<AssetType>('character');

  // Pixel Canvas Tools & Settings
  const [tool, setTool] = useState<EditorTool>('pencil');
  const [palette, setPalette] = useState<PalettePreset>(RPG_PALETTES[0]);
  const [activeColor, setActiveColor] = useState<string>(RPG_PALETTES[0].colors[13] || '#fee761');
  const [zoom, setZoom] = useState<number>(12);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false);

  // Undo / Redo Stacks
  const [history, setHistory] = useState<PixelGrid[]>([]);
  const [redoStack, setRedoStack] = useState<PixelGrid[]>([]);

  // Determine current active grid based on activeTab
  const getCurrentActiveGrid = useCallback((): PixelGrid => {
    if (activeTab === 'tileset') {
      const tile = tileset.tiles.find(t => t.id === selectedTileId) || tileset.tiles[0];
      return tile ? tile.grid : createEmptyGrid(tileset.gridSize);
    }
    // Default: Character animation frame
    const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
    const seq = character.animations[animKey];
    if (seq && seq.frames[activeFrameIndex]) {
      return seq.frames[activeFrameIndex];
    }
    return createEmptyGrid(character.gridSize);
  }, [activeTab, tileset, selectedTileId, currentAnimType, currentDirection, character, activeFrameIndex]);

  // Determine previous frame for Onion Skinning
  const getOnionSkinGrid = useCallback((): PixelGrid | null => {
    if (activeTab !== 'character' || !showOnionSkin) return null;
    const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
    const seq = character.animations[animKey];
    if (!seq || seq.frames.length <= 1) return null;

    const prevIndex = (activeFrameIndex - 1 + seq.frames.length) % seq.frames.length;
    return seq.frames[prevIndex] || null;
  }, [activeTab, showOnionSkin, currentAnimType, currentDirection, character, activeFrameIndex]);

  const activeGrid = getCurrentActiveGrid();

  // Commit canvas updates back to Character or Tileset
  const handleGridChange = (newGrid: PixelGrid) => {
    // Push current grid to history
    setHistory(prev => [...prev.slice(-30), cloneGrid(activeGrid)]);
    setRedoStack([]);

    if (activeTab === 'tileset') {
      setTileset(prev => ({
        ...prev,
        tiles: prev.tiles.map(t =>
          t.id === selectedTileId ? { ...t, grid: newGrid } : t
        ),
      }));
    } else {
      const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
      setCharacter(prev => {
        const updated = { ...prev };
        const seq = updated.animations[animKey];
        if (seq) {
          const newFrames = [...seq.frames];
          newFrames[activeFrameIndex] = newGrid;
          updated.animations[animKey] = {
            ...seq,
            frames: newFrames,
          };
        }
        return updated;
      });
    }
  };

  // Undo Handler
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, cloneGrid(activeGrid)]);

    if (activeTab === 'tileset') {
      setTileset(prev => ({
        ...prev,
        tiles: prev.tiles.map(t =>
          t.id === selectedTileId ? { ...t, grid: previous } : t
        ),
      }));
    } else {
      const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
      setCharacter(prev => {
        const updated = { ...prev };
        const seq = updated.animations[animKey];
        if (seq) {
          const newFrames = [...seq.frames];
          newFrames[activeFrameIndex] = previous;
          updated.animations[animKey] = { ...seq, frames: newFrames };
        }
        return updated;
      });
    }
  };

  // Redo Handler
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, cloneGrid(activeGrid)]);

    if (activeTab === 'tileset') {
      setTileset(prev => ({
        ...prev,
        tiles: prev.tiles.map(t =>
          t.id === selectedTileId ? { ...t, grid: next } : t
        ),
      }));
    } else {
      const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
      setCharacter(prev => {
        const updated = { ...prev };
        const seq = updated.animations[animKey];
        if (seq) {
          const newFrames = [...seq.frames];
          newFrames[activeFrameIndex] = next;
          updated.animations[animKey] = { ...seq, frames: newFrames };
        }
        return updated;
      });
    }
  };

  // Clear Frame Handler
  const handleClearFrame = () => {
    const size = activeTab === 'tileset' ? tileset.gridSize : character.gridSize;
    handleGridChange(createEmptyGrid(size));
  };

  // Flip Horizontal
  const handleFlipHorizontal = () => {
    const size = activeGrid.length;
    const flipped = createEmptyGrid(size as GridSize);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        flipped[r][c] = activeGrid[r][size - 1 - c];
      }
    }
    handleGridChange(flipped);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'p') {
        setTool('pencil');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser');
      } else if (e.key.toLowerCase() === 'b') {
        setTool('bucket');
      } else if (e.key.toLowerCase() === 'i') {
        setTool('picker');
      } else if (e.key.toLowerCase() === 'l') {
        setTool('line');
      } else if (e.key.toLowerCase() === 'd') {
        setTool('dither');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack, activeGrid]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Strict Top Bar Contract Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
        characterName={character.name}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* TAB 1: Character Studio */}
        {activeTab === 'character' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Tool Palette (3 cols) */}
              <div className="lg:col-span-3">
                <Toolbar
                  tool={tool}
                  setTool={setTool}
                  activeColor={activeColor}
                  setActiveColor={setActiveColor}
                  palette={palette}
                  setPalette={setPalette}
                  zoom={zoom}
                  setZoom={setZoom}
                  showGrid={showGrid}
                  setShowGrid={setShowGrid}
                  showOnionSkin={showOnionSkin}
                  setShowOnionSkin={setShowOnionSkin}
                  canUndo={history.length > 0}
                  canRedo={redoStack.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClearFrame}
                  onFlipH={handleFlipHorizontal}
                />
              </div>

              {/* Center Column: Interactive Pixel Canvas (9 cols) */}
              <div className="lg:col-span-9 flex flex-col items-center">
                <PixelCanvas
                  grid={activeGrid}
                  onChange={handleGridChange}
                  tool={tool}
                  activeColor={activeColor}
                  setActiveColor={setActiveColor}
                  zoom={zoom}
                  showGrid={showGrid}
                  onionSkinGrid={getOnionSkinGrid()}
                  showOnionSkin={showOnionSkin}
                />
              </div>
            </div>

            {/* Bottom: 4-Direction Animation Timeline */}
            <AnimationTimeline
              character={character}
              setCharacter={setCharacter}
              currentDirection={currentDirection}
              setCurrentDirection={setCurrentDirection}
              currentAnimType={currentAnimType}
              setCurrentAnimType={setCurrentAnimType}
              activeFrameIndex={activeFrameIndex}
              setActiveFrameIndex={setActiveFrameIndex}
              currentGrid={activeGrid}
              onUpdateCurrentFrame={handleGridChange}
            />
          </div>
        )}

        {/* TAB 2: Tileset Studio */}
        {activeTab === 'tileset' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Tools (3 cols) */}
              <div className="lg:col-span-3">
                <Toolbar
                  tool={tool}
                  setTool={setTool}
                  activeColor={activeColor}
                  setActiveColor={setActiveColor}
                  palette={palette}
                  setPalette={setPalette}
                  zoom={zoom}
                  setZoom={setZoom}
                  showGrid={showGrid}
                  setShowGrid={setShowGrid}
                  showOnionSkin={false}
                  setShowOnionSkin={() => {}}
                  canUndo={history.length > 0}
                  canRedo={redoStack.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClearFrame}
                  onFlipH={handleFlipHorizontal}
                />
              </div>

              {/* Center: Canvas for the selected tile (9 cols) */}
              <div className="lg:col-span-9 flex flex-col items-center">
                <PixelCanvas
                  grid={activeGrid}
                  onChange={handleGridChange}
                  tool={tool}
                  activeColor={activeColor}
                  setActiveColor={setActiveColor}
                  zoom={zoom}
                  showGrid={showGrid}
                  showOnionSkin={false}
                />
              </div>
            </div>

            {/* Bottom: Tileset Grid Inspector */}
            <TilesetStudio
              tileset={tileset}
              setTileset={setTileset}
              selectedTileId={selectedTileId}
              setSelectedTileId={setSelectedTileId}
              onEditTileInCanvas={() => {
                setHistory([]);
                setRedoStack([]);
              }}
            />
          </div>
        )}

        {/* TAB 3: Reference Image & AI Generator */}
        {activeTab === 'generator' && (
          <ReferenceGenerator
            onApplyCharacter={(newChar) => {
              setCharacter(newChar);
              setActiveTab('character');
            }}
            onApplyTileset={(newTileset) => {
              setTileset(newTileset);
              setActiveTab('tileset');
            }}
            currentStyle={generatorStyle}
            setCurrentStyle={setGeneratorStyle}
            gridSize={generatorGridSize}
            setGridSize={setGeneratorGridSize}
            assetType={generatorAssetType}
            setAssetType={setAssetType}
          />
        )}

        {/* TAB 4: Real-time 2D Playtest Arena */}
        {activeTab === 'playtest' && (
          <PlaytestArena
            character={character}
            tileset={tileset}
          />
        )}
      </main>

      {/* Engine Export Modal */}
      <EngineExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        character={character}
        tileset={tileset}
      />
    </div>
  );
}
