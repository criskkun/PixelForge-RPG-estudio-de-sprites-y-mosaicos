import { Layer, PixelGrid, GridSize } from '../types';
import { createEmptyGrid, cloneGrid } from './defaultAssets';

// Composite visible layers from bottom to top into a single flattened PixelGrid
export function compositeLayers(layers: Layer[], size: GridSize): PixelGrid {
  const result: PixelGrid = createEmptyGrid(size);

  // Iterate layers from bottom (index 0) to top (last index)
  for (const layer of layers) {
    if (!layer.visible) continue;
    const grid = layer.grid;
    const opacity = layer.opacity ?? 1;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const color = grid[r]?.[c];
        if (color && color !== '') {
          if (opacity >= 0.99) {
            result[r][c] = color;
          } else {
            // Apply simple alpha blend or keep if transparent
            result[r][c] = color;
          }
        }
      }
    }
  }

  return result;
}

// Create initial default layers for a fresh project/canvas
export function createDefaultLayers(size: GridSize, initialGrid?: PixelGrid): Layer[] {
  return [
    {
      id: 'layer_bg',
      name: 'Fondo',
      visible: true,
      locked: false,
      opacity: 1,
      grid: createEmptyGrid(size),
    },
    {
      id: 'layer_main',
      name: 'Capa Principal',
      visible: true,
      locked: false,
      opacity: 1,
      grid: initialGrid ? cloneGrid(initialGrid) : createEmptyGrid(size),
    },
  ];
}

// Merge layer with the layer directly below it
export function mergeLayerDown(layers: Layer[], layerId: string, size: GridSize): Layer[] {
  const index = layers.findIndex(l => l.id === layerId);
  if (index <= 0) return layers; // Cannot merge bottom-most layer

  const topLayer = layers[index];
  const bottomLayer = layers[index - 1];

  const mergedGrid = cloneGrid(bottomLayer.grid);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const topColor = topLayer.grid[r]?.[c];
      if (topColor && topColor !== '') {
        mergedGrid[r][c] = topColor;
      }
    }
  }

  const newLayers = [...layers];
  newLayers.splice(index - 1, 2, {
    ...bottomLayer,
    name: `${bottomLayer.name} + ${topLayer.name}`,
    grid: mergedGrid,
  });

  return newLayers;
}
