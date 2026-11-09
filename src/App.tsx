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
  AssetType,
  AppView,
  ProjectData,
  Layer
} from './types';
import { createDefaultCharacter, createDefaultTileset, cloneGrid, createEmptyGrid } from './utils/defaultAssets';
import { createDefaultLayers, compositeLayers } from './utils/layerUtils';
import { RPG_PALETTES } from './utils/palettes';
import { LeftSidebar } from './components/LeftSidebar';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { Toolbar } from './components/Toolbar';
import { PixelCanvas } from './components/PixelCanvas';
import { AnimationTimeline } from './components/AnimationTimeline';
import { TilesetStudio } from './components/TilesetStudio';
import { ReferenceGenerator } from './components/ReferenceGenerator';
import { PixelLabStudio } from './components/PixelLabStudio';
import { ProjectsManager } from './components/ProjectsManager';
import { LibraryManager } from './components/LibraryManager';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { PlaytestArena } from './components/PlaytestArena';
import { EngineExportModal } from './components/EngineExportModal';
import { AuthModal } from './components/AuthModal';
import { pixelArtApi, AuthUserProfile } from './services/pixelArtApi';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  // Navigation & View
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Authentication & Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AuthUserProfile | null>(null);

  // PixelLab Connection Status
  const [hasPixelLab, setHasPixelLab] = useState(false);

  // Current Project State (Backed by Cloud SQL / PostgreSQL)
  const [project, setProject] = useState<ProjectData>(() => ({
    name: 'Héroe RPG Top-Down',
    description: 'Personaje con animaciones en 4 direcciones y capas para Godot 4 y Unity.',
    width: 32,
    height: 32,
    palette: RPG_PALETTES[0].colors,
    layers: createDefaultLayers(32, createDefaultCharacter().animations.walk_down?.frames[0]),
    animations: {},
  }));

  const [activeLayerId, setActiveLayerId] = useState<string>('layer_main');
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Character Editor State
  const [character, setCharacter] = useState<CharacterSheet>(createDefaultCharacter);
  const [tileset, setTileset] = useState<TilesetSheet>(createDefaultTileset);
  const [currentDirection, setCurrentDirection] = useState<Direction>('down');
  const [currentAnimType, setCurrentAnimType] = useState<AnimationType>('walk');
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  // Tileset Editor State
  const [selectedTileId, setSelectedTileId] = useState<string>('grass_center');

  // Tools & Canvas Settings
  const [tool, setTool] = useState<EditorTool>('pencil');
  const [palette, setPalette] = useState<PalettePreset>(RPG_PALETTES[0]);
  const [activeColor, setActiveColor] = useState<string>(RPG_PALETTES[0].colors[13] || '#fee761');
  const [recentColors, setRecentColors] = useState<string[]>([RPG_PALETTES[0].colors[13], '#ffffff', '#181425']);
  const [zoom, setZoom] = useState<number>(12);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<number>(1);
  const [symmetryX, setSymmetryX] = useState<boolean>(false);
  const [symmetryY, setSymmetryY] = useState<boolean>(false);
  const [ditherPattern, setDitherPattern] = useState<'none' | 'bayer' | 'check' | 'diagonal'>('none');

  // History Stacks (Undo / Redo)
  const [history, setHistory] = useState<PixelGrid[]>([]);
  const [redoStack, setRedoStack] = useState<PixelGrid[]>([]);

  const loadProfile = useCallback(async () => {
    try {
      const prof = await pixelArtApi.auth.getProfile();
      setUserProfile(prof);
    } catch (e) {
      console.warn('Could not load user profile:', e);
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = pixelArtApi.auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      loadProfile();
    });
    return () => unsubscribe();
  }, [loadProfile]);

  // Check PixelLab Status
  useEffect(() => {
    pixelArtApi.pixelLab.getStatus()
      .then(data => setHasPixelLab(Boolean(data.configured)))
      .catch(() => {});
  }, []);

  // Update recent colors when active color changes
  const handleColorChange = (newColor: string) => {
    setActiveColor(newColor);
    setRecentColors(prev => {
      if (prev.includes(newColor)) return prev;
      return [newColor, ...prev.slice(0, 15)];
    });
  };

  // Find active layer
  const activeLayer = project.layers.find(l => l.id === activeLayerId) || project.layers[0];

  // Composite grid for canvas view
  const compositedGrid = compositeLayers(project.layers, project.width as GridSize);

  // Handle Canvas Drawing - Writes to Active Layer
  const handleGridChange = (newGrid: PixelGrid) => {
    if (activeLayer.locked) return;

    setHistory(prev => [...prev.slice(-30), cloneGrid(activeLayer.grid)]);
    setRedoStack([]);

    // Update active layer grid in project
    setProject(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === activeLayer.id ? { ...l, grid: newGrid } : l),
    }));

    // If editing character frame, sync back to character state
    const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
    setCharacter(prev => {
      const updated = { ...prev };
      const seq = updated.animations[animKey];
      if (seq) {
        const newFrames = [...seq.frames];
        newFrames[activeFrameIndex] = newGrid;
        updated.animations[animKey] = { ...seq, frames: newFrames };
      }
      return updated;
    });
  };

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, cloneGrid(activeLayer.grid)]);

    setProject(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === activeLayer.id ? { ...l, grid: previous } : l),
    }));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, cloneGrid(activeLayer.grid)]);

    setProject(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === activeLayer.id ? { ...l, grid: next } : l),
    }));
  };

  // Flip & Rotate
  const handleFlipHorizontal = () => {
    const size = project.width;
    const flipped = createEmptyGrid(size as GridSize);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        flipped[r][c] = activeLayer.grid[r][size - 1 - c];
      }
    }
    handleGridChange(flipped);
  };

  const handleFlipVertical = () => {
    const size = project.width;
    const flipped = createEmptyGrid(size as GridSize);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        flipped[r][c] = activeLayer.grid[size - 1 - r][c];
      }
    }
    handleGridChange(flipped);
  };

  const handleRotate = () => {
    const size = project.width;
    const rotated = createEmptyGrid(size as GridSize);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        rotated[c][size - 1 - r] = activeLayer.grid[r][c];
      }
    }
    handleGridChange(rotated);
  };

  const handleClearFrame = () => {
    handleGridChange(createEmptyGrid(project.width as GridSize));
  };

  // Save Project / Document to Cloud SQL Database
  const handleSaveProject = async () => {
    setIsSavingProject(true);
    try {
      const saved = await pixelArtApi.projects.saveDocument(project);
      if (saved && saved.id) {
        setProject(prev => ({ ...prev, id: saved.id }));
      }
    } catch (e: any) {
      console.error('Save project error:', e);
      alert('Error al guardar documento: ' + e.message);
    } finally {
      setIsSavingProject(false);
    }
  };

  // Load an Asset from Library or PixelLab into Canvas
  const handleLoadIntoCanvas = (grid: PixelGrid, name?: string) => {
    const size = grid.length as GridSize;
    const newLayers = createDefaultLayers(size, grid);
    setProject(prev => ({
      ...prev,
      name: name || prev.name,
      width: size,
      height: size,
      layers: newLayers,
    }));
    setActiveLayerId('layer_main');
    setCurrentView('editor');
  };

  // Save an item to Library
  const handleSaveToLibrary = async (asset: { name: string; category: string; data: any; thumbnail?: string; dimensions: string }) => {
    try {
      await pixelArtApi.library.save(asset);
      alert('¡Recurso guardado con éxito en tu biblioteca de Cloud SQL!');
    } catch (e: any) {
      alert('Error al guardar en biblioteca: ' + e.message);
    }
  };

  // Login Modal Trigger
  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await pixelArtApi.auth.logout();
      setUserProfile(null);
    } catch (err: any) {
      console.warn('Sign-out error:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Left Sidebar Navigation */}
      <LeftSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        hasPixelLab={hasPixelLab}
      />

      {/* 2. Main Studio Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar
          project={project}
          setProject={setProject}
          onNewProject={() => {
            const freshLayers = createDefaultLayers(32);
            setProject({
              name: 'Nuevo Sprite RPG',
              width: 32,
              height: 32,
              palette: RPG_PALETTES[0].colors,
              layers: freshLayers,
              animations: {},
            });
            setActiveLayerId('layer_main');
            setCurrentView('editor');
          }}
          onOpenProjects={() => setCurrentView('projects')}
          onSaveProject={handleSaveProject}
          isSaving={isSavingProject}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onOpenExport={() => setIsExportModalOpen(true)}
          onImportImage={() => setCurrentView('characters')}
        />

        {/* Central Workspace Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/60 flex flex-col">
            {/* VIEW: DASHBOARD */}
            {currentView === 'dashboard' && (
              <DashboardView
                setCurrentView={setCurrentView}
                currentProject={project}
                hasPixelLab={hasPixelLab}
                onNewProject={() => {
                  setProject({
                    name: 'Nuevo Proyecto RPG',
                    width: 32,
                    height: 32,
                    palette: RPG_PALETTES[0].colors,
                    layers: createDefaultLayers(32),
                    animations: {},
                  });
                  setCurrentView('editor');
                }}
              />
            )}

            {/* VIEW: PROJECTS (Cloud SQL) */}
            {currentView === 'projects' && (
              <ProjectsManager
                currentProject={project}
                onLoadProject={(proj) => {
                  setProject(proj);
                  if (proj.layers && proj.layers.length > 0) {
                    setActiveLayerId(proj.layers[0].id);
                  }
                  setCurrentView('editor');
                }}
                onProjectSaved={handleSaveProject}
              />
            )}

            {/* VIEW: EDITOR PIXEL ART */}
            {currentView === 'editor' && (
              <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Tools Panel (3 cols) */}
                  <div className="lg:col-span-3">
                    <Toolbar
                      tool={tool}
                      setTool={setTool}
                      activeColor={activeColor}
                      setActiveColor={handleColorChange}
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
                      onFlipV={handleFlipVertical}
                      onRotate={handleRotate}
                    />
                  </div>

                  {/* Pixel Canvas (9 cols) */}
                  <div className="lg:col-span-9 flex flex-col items-center">
                    <PixelCanvas
                      grid={activeLayer.grid}
                      onChange={handleGridChange}
                      tool={tool}
                      activeColor={activeColor}
                      setActiveColor={handleColorChange}
                      zoom={zoom}
                      showGrid={showGrid}
                      showOnionSkin={showOnionSkin}
                      brushSize={brushSize}
                      symmetryX={symmetryX}
                      symmetryY={symmetryY}
                      ditherPattern={ditherPattern}
                    />
                  </div>
                </div>

                {/* Animation Timeline Bar */}
                <AnimationTimeline
                  character={character}
                  setCharacter={setCharacter}
                  currentDirection={currentDirection}
                  setCurrentDirection={setCurrentDirection}
                  currentAnimType={currentAnimType}
                  setCurrentAnimType={setCurrentAnimType}
                  activeFrameIndex={activeFrameIndex}
                  setActiveFrameIndex={setActiveFrameIndex}
                  currentGrid={activeLayer.grid}
                  onUpdateCurrentFrame={handleGridChange}
                />
              </div>
            )}

            {/* VIEW: PIXELLAB AI V2 HUB */}
            {currentView === 'pixellab' && (
              <PixelLabStudio
                onLoadIntoCanvas={handleLoadIntoCanvas}
                onSaveToLibrary={handleSaveToLibrary}
              />
            )}

            {/* VIEW: CHARACTERS (Reference / Generator) */}
            {currentView === 'characters' && (
              <ReferenceGenerator
                onApplyCharacter={(newChar) => {
                  setCharacter(newChar);
                  const firstFrame = newChar.animations.walk_down?.frames[0] || createEmptyGrid(newChar.gridSize);
                  setProject(prev => ({
                    ...prev,
                    name: newChar.name,
                    width: newChar.gridSize,
                    height: newChar.gridSize,
                    layers: createDefaultLayers(newChar.gridSize, firstFrame),
                  }));
                  setActiveLayerId('layer_main');
                  setCurrentView('editor');
                }}
                onApplyTileset={(newTileset) => {
                  setTileset(newTileset);
                  setCurrentView('tilesets');
                }}
                currentStyle="16bit-snes"
                setCurrentStyle={() => {}}
                gridSize={project.width as GridSize}
                setGridSize={(sz) => setProject(prev => ({ ...prev, width: sz, height: sz }))}
                assetType="character"
                setAssetType={() => {}}
              />
            )}

            {/* VIEW: OBJECTS */}
            {currentView === 'objects' && (
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Objetos &amp; Props de Mapa</h3>
                    <p className="text-xs text-slate-400">Cofres, antorchas, puertas y mobiliario con estados de animación.</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('pixellab')}
                    className="px-4 py-2 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Generar Objetos con PixelLab
                  </button>
                </div>
                <TilesetStudio
                  tileset={tileset}
                  setTileset={setTileset}
                  selectedTileId={selectedTileId}
                  setSelectedTileId={setSelectedTileId}
                  onEditTileInCanvas={(grid) => {
                    handleLoadIntoCanvas(grid, 'Objeto Seleccionado');
                  }}
                />
              </div>
            )}

            {/* VIEW: ANIMATIONS */}
            {currentView === 'animations' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Secuenciador de Animación</h3>
                    <p className="text-xs text-slate-400">Edición cuadro a cuadro para las 4 direcciones de personajes top-down.</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('editor')}
                    className="px-4 py-2 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Editar en Lienzo
                  </button>
                </div>
                <AnimationTimeline
                  character={character}
                  setCharacter={setCharacter}
                  currentDirection={currentDirection}
                  setCurrentDirection={setCurrentDirection}
                  currentAnimType={currentAnimType}
                  setCurrentAnimType={setCurrentAnimType}
                  activeFrameIndex={activeFrameIndex}
                  setActiveFrameIndex={setActiveFrameIndex}
                  currentGrid={activeLayer.grid}
                  onUpdateCurrentFrame={handleGridChange}
                />
              </div>
            )}

            {/* VIEW: TILESETS */}
            {currentView === 'tilesets' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <TilesetStudio
                  tileset={tileset}
                  setTileset={setTileset}
                  selectedTileId={selectedTileId}
                  setSelectedTileId={setSelectedTileId}
                  onEditTileInCanvas={(grid) => {
                    handleLoadIntoCanvas(grid, 'Tile de Terreno');
                  }}
                />
              </div>
            )}

            {/* VIEW: LIBRARIES (Cloud SQL) */}
            {currentView === 'libraries' && (
              <LibraryManager
                onLoadIntoCanvas={handleLoadIntoCanvas}
              />
            )}

            {/* VIEW: PLAYTEST 2D */}
            {currentView === 'playtest' && (
              <PlaytestArena
                character={character}
                tileset={tileset}
              />
            )}

            {/* VIEW: EXPORT */}
            {currentView === 'export' && (
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Centro de Exportación</h3>
                    <p className="text-xs text-slate-400">Genera paquetes para Godot 4.x, Unity 2D, spritesheets PNG y JSON.</p>
                  </div>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Abrir Asistente de Exportación
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-cyan-400 font-bold text-sm block">Godot 4.x</span>
                    <p className="text-xs text-slate-400">
                      Incluye archivo de recursos <code>sprite_frames.tres</code> con atlas texturas, escena <code>character.tscn</code> y script GDScript de movimiento top-down.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-slate-200 font-bold text-sm block">Unity 2D</span>
                    <p className="text-xs text-slate-400">
                      Incluye archivo <code>spritesheet.png.meta</code> con rebanado automático, modo Point (no filter) y controlador MonoBehaviour <code>TopDownPlayerController.cs</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: SETTINGS */}
            {currentView === 'settings' && (
              <SettingsView />
            )}
          </div>

          {/* 3. Right Panel (Layers, Colors, Tools) - Visible in editor view */}
          {currentView === 'editor' && (
            <RightPanel
              layers={project.layers}
              setLayers={(newLayers) => {
                setProject(prev => ({
                  ...prev,
                  layers: typeof newLayers === 'function' ? newLayers(prev.layers) : newLayers,
                }));
              }}
              activeLayerId={activeLayerId}
              setActiveLayerId={setActiveLayerId}
              palette={palette}
              setPalette={setPalette}
              activeColor={activeColor}
              setActiveColor={handleColorChange}
              recentColors={recentColors}
              gridSize={project.width as GridSize}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              symmetryX={symmetryX}
              setSymmetryX={setSymmetryX}
              symmetryY={symmetryY}
              setSymmetryY={setSymmetryY}
              ditherPattern={ditherPattern}
              setDitherPattern={setDitherPattern}
              onExtractPaletteFromImage={() => setCurrentView('characters')}
            />
          )}
        </div>
      </div>

      {/* Engine Export Modal */}
      <EngineExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        character={character}
        tileset={tileset}
      />

      {/* User Authentication & Account Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onUserChange={loadProfile}
      />
    </div>
  );
}
