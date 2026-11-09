export type RenderStyle = 
  | '16bit-snes' 
  | 'gba-pokemon' 
  | 'modern-hd' 
  | '8bit-nes' 
  | 'dark-gothic' 
  | 'cyberpunk'
  | 'pico-8'
  | 'gameboy-dmg';

export type AssetType = 'character' | 'object' | 'animation' | 'tileset' | 'environment' | 'ui' | 'brush' | 'palette';

export type GridSize = 16 | 24 | 32 | 48 | 64;

export type Direction = 'down' | 'left' | 'right' | 'up' | 'down_left' | 'down_right' | 'up_left' | 'up_right';

export type AnimationType = 'idle' | 'walk' | 'attack' | 'hit' | 'jump' | 'run' | 'cast';

// Pixel matrix: 2D array [row][col] of hex color strings (e.g., "#3b82f6" or "" for transparent)
export type PixelGrid = string[][];

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  grid: PixelGrid;
}

export interface AnimationSequence {
  name: string;
  fps: number;
  frames: PixelGrid[]; // Or composite frames
}

export interface CharacterSheet {
  name: string;
  gridSize: GridSize;
  style: RenderStyle;
  animations: {
    [key in `${AnimationType}_${Direction}`]?: AnimationSequence;
  };
}

export interface TileData {
  id: string;
  name: string;
  role: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'single' | 'obstacle';
  isSolid: boolean;
  grid: PixelGrid;
}

export interface TilesetSheet {
  name: string;
  gridSize: GridSize;
  style: RenderStyle;
  tiles: TileData[];
}

export interface PalettePreset {
  id: string;
  name: string;
  era: string;
  colors: string[];
}

export type EditorTool = 
  | 'pencil' 
  | 'eraser' 
  | 'brush'
  | 'bucket' 
  | 'picker' 
  | 'line' 
  | 'rectangle' 
  | 'circle'
  | 'gradient'
  | 'select'
  | 'dither';

export type TargetEngine = 'godot4' | 'unity' | 'aseprite' | 'png_only' | 'gif';

export type AppView = 
  | 'dashboard'
  | 'projects'
  | 'editor'
  | 'pixellab'
  | 'characters'
  | 'objects'
  | 'animations'
  | 'tilesets'
  | 'libraries'
  | 'playtest'
  | 'export'
  | 'settings';

export interface ProjectData {
  id?: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  palette: string[];
  layers: Layer[];
  animations: Record<string, any>;
  thumbnail?: string;
  tags?: string;
  updatedAt?: string;
}

export interface LibraryItem {
  id?: number;
  name: string;
  category: AssetType;
  dimensions: string;
  tags?: string;
  data: any;
  thumbnail?: string;
  source: 'pixellab' | 'custom' | 'gemini';
  createdAt?: string;
}
