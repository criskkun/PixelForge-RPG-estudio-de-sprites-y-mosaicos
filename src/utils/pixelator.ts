import { GridSize, PixelGrid, RenderStyle, CharacterSheet, Direction, TilesetSheet } from '../types';
import { RPG_PALETTES, findClosestPaletteColor } from './palettes';
import { createEmptyGrid, cloneGrid } from './defaultAssets';

export interface PixelationOptions {
  gridSize: GridSize;
  style: RenderStyle;
  dithering: 'none' | 'bayer' | 'floyd';
  removeBackground: boolean;
  bgTolerance: number; // 0 to 100
  outlineEnhancement: boolean;
  contrastBoost: number; // 0 to 50%
}

// 4x4 Bayer matrix normalized to -0.5 .. +0.5
const BAYER_4X4 = [
  [ 0/16 - 0.5,  8/16 - 0.5,  2/16 - 0.5, 10/16 - 0.5],
  [12/16 - 0.5,  4/16 - 0.5, 14/16 - 0.5,  6/16 - 0.5],
  [ 3/16 - 0.5, 11/16 - 0.5,  1/16 - 0.5,  9/16 - 0.5],
  [15/16 - 0.5,  7/16 - 0.5, 13/16 - 0.5,  5/16 - 0.5]
];

// Read an image file or DataURL and render onto an offscreen canvas
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('No se pudo cargar la imagen de referencia.'));
    img.src = src;
  });
}

// Convert image element to downsampled PixelGrid with quantization and styling
export async function pixelateImage(
  imageSource: HTMLImageElement | string,
  options: PixelationOptions
): Promise<PixelGrid> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const size = options.gridSize;

  // Offscreen canvas for sampling
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Disable smoothing for crisp pixel interpolation
  ctx.imageSmoothingEnabled = false;

  // Calculate aspect ratio preserve fit inside square
  const aspect = img.width / img.height;
  let dw: number = size;
  let dh: number = size;
  let dx: number = 0;
  let dy: number = 0;

  if (aspect > 1) {
    dh = Math.round(size / aspect);
    dy = Math.round((size - dh) / 2);
  } else if (aspect < 1) {
    dw = Math.round(size * aspect);
    dx = Math.round((size - dw) / 2);
  }

  ctx.drawImage(img, dx, dy, dw, dh);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Find target palette
  const targetPalette = RPG_PALETTES.find(p => p.id === options.style) || RPG_PALETTES[0];
  const palette = targetPalette.colors;

  // Detect corner background color for auto-removal
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  const bgA = data[3];

  const grid: PixelGrid = createEmptyGrid(size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];
      const a = data[idx + 3];

      // Transparent if original pixel was transparent
      if (a < 64) {
        grid[y][x] = '';
        continue;
      }

      // Background removal check
      if (options.removeBackground) {
        const colorDiff = Math.sqrt(
          Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
        );
        // Normalize diff to 0-100 scale
        const normalizedDiff = (colorDiff / 441.67) * 100;
        if (normalizedDiff <= options.bgTolerance || (bgA < 128 && a < 128)) {
          grid[y][x] = '';
          continue;
        }
      }

      // Contrast boost if enabled
      if (options.contrastBoost > 0) {
        const factor = (259 * (options.contrastBoost * 2 + 255)) / (255 * (259 - options.contrastBoost * 2));
        r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
        g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
        b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
      }

      // Dithering modification
      if (options.dithering === 'bayer') {
        const ditherVal = BAYER_4X4[y % 4][x % 4] * 32;
        r = Math.min(255, Math.max(0, r + ditherVal));
        g = Math.min(255, Math.max(0, g + ditherVal));
        b = Math.min(255, Math.max(0, b + ditherVal));
      }

      // Convert to hex
      const hex = `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
      const quantized = findClosestPaletteColor(hex, palette);
      grid[y][x] = quantized;
    }
  }

  // Outline enhancement (add 1px dark contour around non-empty pixels if requested)
  if (options.outlineEnhancement) {
    const darkOutline = palette[0] || '#181425';
    const enhanced = cloneGrid(grid);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === '') {
          // Check if adjacent to solid pixel
          const hasNeighbor = 
            (y > 0 && grid[y - 1][x] !== '') ||
            (y < size - 1 && grid[y + 1][x] !== '') ||
            (x > 0 && grid[y][x - 1] !== '') ||
            (x < size - 1 && grid[y][x + 1] !== '');
          if (hasNeighbor) {
            enhanced[y][x] = darkOutline;
          }
        }
      }
    }
    return enhanced;
  }

  return grid;
}

// Generate a complete 4-direction character sheet from a single reference base frame
export function synthesizeCharacterFromBase(
  baseGrid: PixelGrid,
  name: string,
  gridSize: GridSize,
  style: RenderStyle
): CharacterSheet {
  const size = gridSize;
  const directions: Direction[] = ['down', 'left', 'right', 'up'];
  const animations: CharacterSheet['animations'] = {};

  // Analyze character bounds
  let minY: number = size, maxY: number = 0, minX: number = size, maxX: number = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (baseGrid[r][c] !== '') {
        if (r < minY) minY = r;
        if (r > maxY) maxY = r;
        if (c < minX) minX = c;
        if (c > maxX) maxX = c;
      }
    }
  }

  const charHeight = Math.max(8, maxY - minY);
  const headEnd = minY + Math.floor(charHeight * 0.35);
  const bodyEnd = minY + Math.floor(charHeight * 0.7);

  // Generate walk frames for each direction
  for (const dir of directions) {
    const frames: PixelGrid[] = [];

    for (let step = 0; step < 4; step++) {
      const frame = createEmptyGrid(size);
      const bob = (step === 1 || step === 3) ? 1 : 0;
      const legShift = (step === 1) ? 1 : (step === 3) ? -1 : 0;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          let srcCol = c;
          if (dir === 'left') {
            // Mirror from right side or base
            srcCol = size - 1 - c;
          }

          let srcRow = r;
          if (r < bodyEnd) {
            // Head and torso bob up and down
            srcRow = r - bob;
          }

          if (srcRow >= 0 && srcRow < size && srcCol >= 0 && srcCol < size) {
            let color = baseGrid[srcRow][srcCol];

            // If we are looking up, dim / dark cape effect
            if (dir === 'up' && color !== '' && r > headEnd) {
              // Darken color slightly or keep silhouette
            }

            // Legs shift
            if (r >= bodyEnd && color !== '') {
              const shiftedCol = c + legShift;
              if (shiftedCol >= 0 && shiftedCol < size) {
                frame[r][shiftedCol] = color;
                continue;
              }
            }

            frame[r][c] = color;
          }
        }
      }

      frames.push(frame);
    }

    animations[`walk_${dir}`] = {
      name: `walk_${dir}`,
      fps: 6,
      frames,
    };

    animations[`idle_${dir}`] = {
      name: `idle_${dir}`,
      fps: 2,
      frames: [frames[0], frames[2] || frames[0]],
    };
  }

  return {
    name: name.replace(/\s+/g, '_') || 'Custom_RPG_Character',
    gridSize,
    style,
    animations,
  };
}

// Generate 3x3 RPG Autotile set from a single ground texture reference
export function synthesizeTilesetFromBase(
  baseGrid: PixelGrid,
  name: string,
  gridSize: GridSize,
  style: RenderStyle
): TilesetSheet {
  const size = gridSize;
  const tiles: TilesetSheet['tiles'] = [];
  const edgeDepth = Math.max(3, Math.floor(size * 0.25));

  const darkOutline = RPG_PALETTES.find(p => p.id === style)?.colors[0] || '#181425';
  const subBaseColor = RPG_PALETTES.find(p => p.id === style)?.colors[2] || '#3a4466';

  // 1. Center
  tiles.push({
    id: 'tile_center',
    name: 'Centro Terreno (Piso)',
    role: 'center',
    isSolid: false,
    grid: cloneGrid(baseGrid),
  });

  // 2. Top Edge
  const topGrid = cloneGrid(baseGrid);
  for (let r = 0; r < edgeDepth; r++) {
    for (let c = 0; c < size; c++) {
      if (r === 0) topGrid[r][c] = darkOutline;
      else if (r < edgeDepth - 1) topGrid[r][c] = subBaseColor;
    }
  }
  tiles.push({
    id: 'tile_top',
    name: 'Borde Superior',
    role: 'top',
    isSolid: false,
    grid: topGrid,
  });

  // 3. Bottom Edge
  const bottomGrid = cloneGrid(baseGrid);
  for (let r = size - edgeDepth; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === size - 1) bottomGrid[r][c] = darkOutline;
      else if (r > size - edgeDepth + 1) bottomGrid[r][c] = subBaseColor;
    }
  }
  tiles.push({
    id: 'tile_bottom',
    name: 'Borde Inferior',
    role: 'bottom',
    isSolid: false,
    grid: bottomGrid,
  });

  // 4. Left Edge
  const leftGrid = cloneGrid(baseGrid);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < edgeDepth; c++) {
      if (c === 0) leftGrid[r][c] = darkOutline;
      else if (c < edgeDepth - 1) leftGrid[r][c] = subBaseColor;
    }
  }
  tiles.push({
    id: 'tile_left',
    name: 'Borde Izquierdo',
    role: 'left',
    isSolid: false,
    grid: leftGrid,
  });

  // 5. Right Edge
  const rightGrid = cloneGrid(baseGrid);
  for (let r = 0; r < size; r++) {
    for (let c = size - edgeDepth; c < size; c++) {
      if (c === size - 1) rightGrid[r][c] = darkOutline;
      else if (c > size - edgeDepth + 1) rightGrid[r][c] = subBaseColor;
    }
  }
  tiles.push({
    id: 'tile_right',
    name: 'Borde Derecho',
    role: 'right',
    isSolid: false,
    grid: rightGrid,
  });

  // 6. Solid Wall / Obstacle Variant
  const solidGrid = cloneGrid(baseGrid);
  // Add heavy stone/barrier borders
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === 0 || r === size - 1 || c === 0 || c === size - 1) {
        solidGrid[r][c] = darkOutline;
      } else if (r % 6 === 0) {
        solidGrid[r][c] = darkOutline;
      }
    }
  }
  tiles.push({
    id: 'tile_obstacle',
    name: 'Muro / Obstáculo Sólido',
    role: 'obstacle',
    isSolid: true,
    grid: solidGrid,
  });

  return {
    name: name.replace(/\s+/g, '_') || 'Custom_RPG_Tileset',
    gridSize,
    style,
    tiles,
  };
}
