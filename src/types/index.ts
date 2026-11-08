export type RenderStyle = 
  | '16bit-snes' 
  | 'gba-pokemon' 
  | 'modern-hd' 
  | '8bit-nes' 
  | 'dark-gothic' 
  | 'cyberpunk';

export type AssetType = 'character' | 'tileset' | 'prop';

export type GridSize = 16 | 24 | 32 | 48 | 64;

export type Direction = 'down' | 'left' | 'right' | 'up';

export type AnimationType = 'idle' | 'walk' | 'attack' | 'hit';

// Pixel matrix: 2D array [row][col] of hex color strings (e.g., "#3b82f6" or "" for transparent)
export type PixelGrid = string[][];

export interface AnimationSequence {
  name: string;
  fps: number;
  frames: PixelGrid[];
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

export type EditorTool = 'pencil' | 'eraser' | 'bucket' | 'picker' | 'line' | 'rectangle' | 'dither';

export type TargetEngine = 'godot4' | 'unity' | 'aseprite' | 'png_only';
