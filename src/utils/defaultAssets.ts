import { CharacterSheet, TilesetSheet, PixelGrid, GridSize } from '../types';

// Helper to create an empty NxN pixel grid
export function createEmptyGrid(size: GridSize): PixelGrid {
  return Array.from({ length: size }, () => Array(size).fill(''));
}

// Clone grid
export function cloneGrid(grid: PixelGrid): PixelGrid {
  return grid.map(row => [...row]);
}

// Generate base 32x32 Knight character frame
function generateKnightFrame(direction: 'down' | 'up' | 'left' | 'right', step: number): PixelGrid {
  const size = 32;
  const grid = createEmptyGrid(size);

  const skin = '#ead4aa';
  const hair = '#733e39';
  const armorSteel = '#8b9bb4';
  const armorHighlight = '#c0cbdc';
  const armorShadow = '#5a6988';
  const capeRed = '#e43b44';
  const capeShadow = '#a22633';
  const goldTrim = '#fee761';
  const boots = '#3e2731';
  const outline = '#181425';

  const bob = (step === 1 || step === 3) ? 1 : 0;
  const legOffset = (step === 1) ? 2 : (step === 3) ? -2 : 0;

  if (direction === 'down') {
    // Cape behind shoulders
    for (let r = 16 + bob; r <= 25 + bob; r++) {
      for (let c = 10; c <= 21; c++) {
        grid[r][c] = (c === 10 || c === 21) ? outline : capeShadow;
      }
    }

    // Helmet & Head (rows 6 to 15)
    for (let r = 6 + bob; r <= 15 + bob; r++) {
      for (let c = 11; c <= 20; c++) {
        // Outline
        if (r === 6 + bob || r === 15 + bob || c === 11 || c === 20) {
          grid[r][c] = outline;
        } else if (r <= 9 + bob) {
          grid[r][c] = (c < 15) ? armorHighlight : armorSteel; // Helmet dome
        } else if (r === 10 + bob) {
          grid[r][c] = goldTrim; // Helmet visor crest
        } else if (r >= 11 + bob && r <= 13 + bob) {
          if (c >= 13 && c <= 18) {
            grid[r][c] = (r === 12 + bob && (c === 14 || c === 17)) ? '#262b44' : skin; // Eyes & face visor opening
          } else {
            grid[r][c] = armorSteel;
          }
        } else {
          grid[r][c] = armorShadow; // Chin guard
        }
      }
    }

    // Chestplate / Armor (rows 16 to 23)
    for (let r = 16 + bob; r <= 23 + bob; r++) {
      for (let c = 11; c <= 20; c++) {
        if (c === 11 || c === 20 || r === 23 + bob) {
          grid[r][c] = outline;
        } else if (r === 16 + bob || r === 17 + bob) {
          grid[r][c] = (c === 15 || c === 16) ? goldTrim : armorHighlight;
        } else if (r === 20 + bob) {
          grid[r][c] = '#d77643'; // Belt
        } else if (r === 21 + bob) {
          grid[r][c] = '#feae34'; // Belt buckle
        } else {
          grid[r][c] = (c <= 15) ? armorSteel : armorShadow;
        }
      }
    }

    // Arms & Pauldrons
    for (let r = 16 + bob; r <= 22 + bob; r++) {
      // Left arm (screen left, c=8..10)
      for (let c = 8; c <= 10; c++) {
        if (c === 8 || r === 22 + bob) grid[r][c] = outline;
        else if (r <= 18 + bob) grid[r][c] = armorHighlight;
        else grid[r][c] = skin;
      }
      // Right arm (screen right, c=21..23)
      for (let c = 21; c <= 23; c++) {
        if (c === 23 || r === 22 + bob) grid[r][c] = outline;
        else if (r <= 18 + bob) grid[r][c] = armorSteel;
        else grid[r][c] = skin;
      }
    }

    // Shield on left hand
    for (let r = 17 + bob; r <= 24 + bob; r++) {
      for (let c = 6; c <= 10; c++) {
        if (r === 17 + bob || r === 24 + bob || c === 6 || c === 10) grid[r][c] = outline;
        else if (c === 8 || r === 20 + bob) grid[r][c] = goldTrim;
        else grid[r][c] = '#124e89';
      }
    }

    // Legs & Boots (rows 24 to 28)
    // Left Leg
    const leftLegRow = 24 + bob + (legOffset > 0 ? 0 : 1);
    for (let r = 24 + bob; r <= 28 + bob; r++) {
      for (let c = 12; c <= 14; c++) {
        if (r === 28 + bob || c === 12 || c === 14) grid[r][c] = outline;
        else grid[r][c] = boots;
      }
    }
    // Right Leg
    for (let r = 24 + bob; r <= 28 + bob; r++) {
      for (let c = 17; c <= 19; c++) {
        if (r === 28 + bob || c === 17 || c === 19) grid[r][c] = outline;
        else grid[r][c] = boots;
      }
    }
  } else if (direction === 'up') {
    // Back view (Cape dominant)
    for (let r = 14 + bob; r <= 26 + bob; r++) {
      for (let c = 10; c <= 21; c++) {
        if (c === 10 || c === 21 || r === 26 + bob) {
          grid[r][c] = outline;
        } else {
          grid[r][c] = (c >= 14 && c <= 17) ? capeRed : capeShadow;
        }
      }
    }

    // Helmet Back (rows 6 to 14)
    for (let r = 6 + bob; r <= 14 + bob; r++) {
      for (let c = 11; c <= 20; c++) {
        if (r === 6 + bob || r === 14 + bob || c === 11 || c === 20) {
          grid[r][c] = outline;
        } else if (r <= 9 + bob) {
          grid[r][c] = armorSteel;
        } else {
          grid[r][c] = (c < 16) ? armorSteel : armorShadow;
        }
      }
    }

    // Hair plumes or crest
    for (let r = 4 + bob; r <= 6 + bob; r++) {
      for (let c = 14; c <= 17; c++) {
        grid[r][c] = capeRed;
      }
    }

    // Legs from behind
    for (let r = 25 + bob; r <= 28 + bob; r++) {
      for (let c = 12; c <= 14; c++) grid[r][c] = boots;
      for (let c = 17; c <= 19; c++) grid[r][c] = boots;
    }
  } else if (direction === 'right') {
    // Side profile right
    // Helmet
    for (let r = 6 + bob; r <= 14 + bob; r++) {
      for (let c = 10; c <= 19; c++) {
        if (r === 6 + bob || r === 14 + bob || c === 10 || c === 19) {
          grid[r][c] = outline;
        } else if (c >= 17 && r >= 10 + bob && r <= 12 + bob) {
          grid[r][c] = (r === 11 + bob && c === 18) ? '#262b44' : skin; // Face opening
        } else {
          grid[r][c] = (r <= 8 + bob) ? armorHighlight : armorSteel;
        }
      }
    }

    // Visor crest
    grid[10 + bob][19] = goldTrim;
    grid[10 + bob][20] = goldTrim;

    // Body
    for (let r = 15 + bob; r <= 23 + bob; r++) {
      for (let c = 11; c <= 19; c++) {
        if (c === 11 || c === 19 || r === 23 + bob) grid[r][c] = outline;
        else grid[r][c] = (c <= 14) ? capeShadow : armorSteel;
      }
    }

    // Cape trailing
    for (let r = 16 + bob; r <= 25 + bob; r++) {
      grid[r][9] = capeShadow;
      grid[r][8] = outline;
    }

    // Sword in hand
    for (let r = 12 + bob; r <= 24 + bob; r++) {
      grid[r][22] = (r >= 20 + bob) ? goldTrim : armorHighlight;
    }

    // Walking legs
    const fLeg = 16 + legOffset;
    const bLeg = 13 - legOffset;
    for (let r = 24 + bob; r <= 28 + bob; r++) {
      for (let c = fLeg - 1; c <= fLeg + 1; c++) {
        if (c >= 0 && c < size) grid[r][c] = boots;
      }
      for (let c = bLeg - 1; c <= bLeg + 1; c++) {
        if (c >= 0 && c < size) grid[r][c] = boots;
      }
    }
  } else if (direction === 'left') {
    // Horizontally mirrored side profile
    const rightGrid = generateKnightFrame('right', step);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = rightGrid[r][size - 1 - c];
      }
    }
  }

  return grid;
}

// Generate default character sheet with 4 directions & 4 walk frames each
export function createDefaultCharacter(): CharacterSheet {
  const directions: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'left', 'right', 'up'];
  const animations: CharacterSheet['animations'] = {};

  for (const dir of directions) {
    const frames: PixelGrid[] = [];
    for (let step = 0; step < 4; step++) {
      frames.push(generateKnightFrame(dir, step));
    }
    animations[`walk_${dir}`] = {
      name: `walk_${dir}`,
      fps: 6,
      frames,
    };
    // Idle is frame 0
    animations[`idle_${dir}`] = {
      name: `idle_${dir}`,
      fps: 2,
      frames: [frames[0], frames[2] || frames[0]],
    };
  }

  return {
    name: 'Hero_Knight_32x32',
    gridSize: 32,
    style: '16bit-snes',
    animations,
  };
}

// Helper to generate RPG 3x3 Grass & Dungeon Tileset
export function createDefaultTileset(): TilesetSheet {
  const size: GridSize = 32;
  const tiles: TilesetSheet['tiles'] = [];

  const grassBase = '#48a838';
  const grassLight = '#80d850';
  const grassShadow = '#287820';
  const dirtBase = '#b07040';
  const dirtShadow = '#784828';
  const stoneBase = '#5a6988';
  const stoneLight = '#8b9bb4';
  const stoneShadow = '#3a4466';
  const waterBase = '#0099db';
  const waterShine = '#2ce8f5';
  const waterDeep = '#124e89';

  // 1. Center grass tile
  const grassCenter = createEmptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rand = (r * 13 + c * 7) % 17;
      if (rand === 0) grassCenter[r][c] = grassLight;
      else if (rand === 1) grassCenter[r][c] = grassShadow;
      else grassCenter[r][c] = grassBase;
    }
  }
  tiles.push({
    id: 'grass_center',
    name: 'Grass Plain (Center)',
    role: 'center',
    isSolid: false,
    grid: grassCenter,
  });

  // 2. Dirt Path Center
  const dirtCenter = createEmptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rand = (r * 11 + c * 19) % 13;
      if (rand === 0) dirtCenter[r][c] = dirtShadow;
      else if (rand === 1) dirtCenter[r][c] = '#d8a068';
      else dirtCenter[r][c] = dirtBase;
    }
  }
  tiles.push({
    id: 'dirt_path',
    name: 'Dirt Path',
    role: 'center',
    isSolid: false,
    grid: dirtCenter,
  });

  // 3. Dungeon Stone Wall (Solid Obstacle)
  const stoneWall = createEmptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const brickRow = Math.floor(r / 8);
      const rowOffset = (brickRow % 2) * 8;
      const brickCol = Math.floor((c + rowOffset) / 16);

      if (r % 8 === 0 || (c + rowOffset) % 16 === 0) {
        stoneWall[r][c] = stoneShadow; // Mortar line
      } else if (r % 8 === 1 || (c + rowOffset) % 16 === 1) {
        stoneWall[r][c] = stoneLight; // Highlight top-left of brick
      } else {
        stoneWall[r][c] = stoneBase;
      }
    }
  }
  tiles.push({
    id: 'stone_wall',
    name: 'Dungeon Stone Wall',
    role: 'obstacle',
    isSolid: true,
    grid: stoneWall,
  });

  // 4. Water / Pond Tile (Solid / impassable)
  const waterTile = createEmptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const wave = Math.sin((r + c * 0.5) * 0.4);
      if (wave > 0.8) waterTile[r][c] = waterShine;
      else if (wave < -0.6) waterTile[r][c] = waterDeep;
      else waterTile[r][c] = waterBase;
    }
  }
  tiles.push({
    id: 'water_pond',
    name: 'Water Pool',
    role: 'obstacle',
    isSolid: true,
    grid: waterTile,
  });

  // 5. Grass Top Edge transition to Dirt
  const grassTop = cloneGrid(grassCenter);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < size; c++) {
      if (r < 6 || (r < 9 && (c % 4 === 0 || c % 3 === 0))) {
        grassTop[r][c] = dirtBase;
      }
    }
  }
  tiles.push({
    id: 'grass_top',
    name: 'Grass Edge (Top)',
    role: 'top',
    isSolid: false,
    grid: grassTop,
  });

  // 6. Grass Bottom Edge
  const grassBottom = cloneGrid(grassCenter);
  for (let r = 22; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r > 26 || (r > 23 && (c % 4 === 0 || c % 3 === 0))) {
        grassBottom[r][c] = dirtBase;
      }
    }
  }
  tiles.push({
    id: 'grass_bottom',
    name: 'Grass Edge (Bottom)',
    role: 'bottom',
    isSolid: false,
    grid: grassBottom,
  });

  // 7. Grass Left Edge
  const grassLeft = cloneGrid(grassCenter);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < 10; c++) {
      if (c < 6 || (c < 9 && (r % 4 === 0))) {
        grassLeft[r][c] = dirtBase;
      }
    }
  }
  tiles.push({
    id: 'grass_left',
    name: 'Grass Edge (Left)',
    role: 'left',
    isSolid: false,
    grid: grassLeft,
  });

  // 8. Grass Right Edge
  const grassRight = cloneGrid(grassCenter);
  for (let r = 0; r < size; r++) {
    for (let c = 22; c < size; c++) {
      if (c > 26 || (c > 23 && (r % 4 === 0))) {
        grassRight[r][c] = dirtBase;
      }
    }
  }
  tiles.push({
    id: 'grass_right',
    name: 'Grass Edge (Right)',
    role: 'right',
    isSolid: false,
    grid: grassRight,
  });

  // 9. Treasure Chest Prop
  const chestGrid = createEmptyGrid(size);
  const gold = '#feae34';
  const wood = '#784828';
  const woodLight = '#b07040';
  const woodDark = '#3e2731';
  const black = '#181425';

  for (let r = 10; r <= 24; r++) {
    for (let c = 7; c <= 24; c++) {
      if (r === 10 || r === 24 || c === 7 || c === 24) {
        chestGrid[r][c] = black; // Outline
      } else if (c === 8 || c === 23 || c === 15 || c === 16 || r === 17) {
        chestGrid[r][c] = gold; // Gold bands & latch
      } else if (r === 18 && (c === 15 || c === 16)) {
        chestGrid[r][c] = black; // Keyhole
      } else {
        chestGrid[r][c] = (r < 17) ? woodLight : wood;
      }
    }
  }
  tiles.push({
    id: 'treasure_chest',
    name: 'Treasure Chest',
    role: 'obstacle',
    isSolid: true,
    grid: chestGrid,
  });

  return {
    name: 'Overworld_Dungeon_32x32',
    gridSize: 32,
    style: '16bit-snes',
    tiles,
  };
}
