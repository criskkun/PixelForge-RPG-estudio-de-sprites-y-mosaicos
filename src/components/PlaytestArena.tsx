import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Compass, Shield, Swords, Gamepad2, Sparkles } from 'lucide-react';
import { CharacterSheet, TilesetSheet, Direction, AnimationType, PixelGrid } from '../types';

interface PlaytestArenaProps {
  character: CharacterSheet;
  tileset: TilesetSheet;
}

export const PlaytestArena: React.FC<PlaytestArenaProps> = ({
  character,
  tileset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Player position & state
  const [posX, setPosX] = useState(256);
  const [posY, setPosY] = useState(224);
  const [direction, setDirection] = useState<Direction>('down');
  const [isWalking, setIsWalking] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [roomPreset, setRoomPreset] = useState<'meadow' | 'dungeon'>('meadow');

  // Input keys tracking
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const posRef = useRef({ x: 256, y: 224 });
  const dirRef = useRef<Direction>('down');
  const isWalkingRef = useRef(false);
  const isAttackingRef = useRef(false);
  const frameIdxRef = useRef(0);
  const frameTickRef = useRef(0);

  posRef.current = { x: posX, y: posY };
  dirRef.current = direction;
  isWalkingRef.current = isWalking;
  isAttackingRef.current = isAttacking;
  frameIdxRef.current = activeFrameIdx;

  // Arena Grid dimensions
  const TILE_DISPLAY_SIZE = 48; // 48px per tile on canvas
  const ARENA_COLS = 14;
  const ARENA_ROWS = 10;
  const CANVAS_WIDTH = ARENA_COLS * TILE_DISPLAY_SIZE;
  const CANVAS_HEIGHT = ARENA_ROWS * TILE_DISPLAY_SIZE;

  // Collision map (1 = solid obstacle, 0 = walkable floor)
  const mapGrid = React.useMemo(() => {
    const grid: number[][] = [];
    for (let r = 0; r < ARENA_ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < ARENA_COLS; c++) {
        // Border walls are always solid
        if (r === 0 || r === ARENA_ROWS - 1 || c === 0 || c === ARENA_COLS - 1) {
          grid[r][c] = 1;
        } else if (roomPreset === 'dungeon' && (r === 3 || r === 4) && (c >= 4 && c <= 8)) {
          // Inner dungeon wall barrier
          grid[r][c] = 1;
        } else if (roomPreset === 'meadow' && (r >= 5 && r <= 6) && (c >= 8 && c <= 10)) {
          // Water pond barrier in meadow
          grid[r][c] = 1;
        } else {
          grid[r][c] = 0;
        }
      }
    }
    return grid;
  }, [roomPreset]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scrolling on arrow keys and spacebar inside playtest
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysDownRef.current[e.key.toLowerCase()] = true;

      if (e.key === ' ' && !isAttackingRef.current) {
        setIsAttacking(true);
        setTimeout(() => setIsAttacking(false), 300);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60FPS Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const speed = 2.8;

    const gameLoop = () => {
      const keys = keysDownRef.current;
      let dx = 0;
      let dy = 0;

      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;

      const moving = dx !== 0 || dy !== 0;
      let newDir = dirRef.current;

      if (moving) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newDir = dx > 0 ? 'right' : 'left';
        } else {
          newDir = dy > 0 ? 'down' : 'up';
        }

        // Normalize speed
        const length = Math.sqrt(dx * dx + dy * dy);
        const normDx = (dx / length) * speed;
        const normDy = (dy / length) * speed;

        let nextX = posRef.current.x + normDx;
        let nextY = posRef.current.y + normDy;

        // Collision detection with bounding box
        const playerRadius = 14;
        const tileX = Math.floor(nextX / TILE_DISPLAY_SIZE);
        const tileY = Math.floor(nextY / TILE_DISPLAY_SIZE);

        const checkCollision = (cx: number, cy: number) => {
          const tCol = Math.floor(cx / TILE_DISPLAY_SIZE);
          const tRow = Math.floor(cy / TILE_DISPLAY_SIZE);
          if (tRow < 0 || tRow >= ARENA_ROWS || tCol < 0 || tCol >= ARENA_COLS) return true;
          return mapGrid[tRow]?.[tCol] === 1;
        };

        const collisionLeft = checkCollision(nextX - playerRadius, posRef.current.y);
        const collisionRight = checkCollision(nextX + playerRadius, posRef.current.y);
        const collisionTop = checkCollision(posRef.current.x, nextY - playerRadius);
        const collisionBottom = checkCollision(posRef.current.x, nextY + playerRadius);

        if (collisionLeft && normDx < 0) nextX = posRef.current.x;
        if (collisionRight && normDx > 0) nextX = posRef.current.x;
        if (collisionTop && normDy < 0) nextY = posRef.current.y;
        if (collisionBottom && normDy > 0) nextY = posRef.current.y;

        posRef.current = { x: nextX, y: nextY };
        setPosX(nextX);
        setPosY(nextY);
      }

      setDirection(newDir);
      setIsWalking(moving);

      // Frame tick
      frameTickRef.current += 1;
      if (moving) {
        if (frameTickRef.current % 8 === 0) {
          setActiveFrameIdx(prev => (prev + 1) % 4);
        }
      } else {
        if (frameTickRef.current % 24 === 0) {
          setActiveFrameIdx(prev => (prev + 1) % 2);
        }
      }

      // Render to canvas
      drawArena();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mapGrid, character, tileset]);

  // Render arena tiles & player sprite
  const drawArena = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Pick tile textures from current tileset
    const groundTile = tileset.tiles.find(t => t.role === 'center') || tileset.tiles[0];
    const wallTile = tileset.tiles.find(t => t.isSolid) || tileset.tiles[1] || groundTile;

    // 1. Draw Map Tiles
    for (let r = 0; r < ARENA_ROWS; r++) {
      for (let c = 0; c < ARENA_COLS; c++) {
        const isSolid = mapGrid[r][c] === 1;
        const targetTile = isSolid ? wallTile : groundTile;
        const grid = targetTile.grid;
        const gSize = grid.length;
        const pxRatio = TILE_DISPLAY_SIZE / gSize;

        for (let tr = 0; tr < gSize; tr++) {
          for (let tc = 0; tc < gSize; tc++) {
            const color = grid[tr][tc];
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(
                c * TILE_DISPLAY_SIZE + tc * pxRatio,
                r * TILE_DISPLAY_SIZE + tr * pxRatio,
                pxRatio + 0.5,
                pxRatio + 0.5
              );
            }
          }
        }
      }
    }

    // 2. Draw Player Drop Shadow
    const pX = posRef.current.x;
    const pY = posRef.current.y;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(pX, pY + 14, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Player Character Frame
    const animState: AnimationType = isAttackingRef.current ? 'attack' : isWalkingRef.current ? 'walk' : 'idle';
    const animSeq = character.animations[`${animState}_${dirRef.current}`] || 
                     character.animations[`walk_${dirRef.current}`] ||
                     character.animations['walk_down'];

    if (animSeq && animSeq.frames.length > 0) {
      const frameIndex = frameIdxRef.current % animSeq.frames.length;
      const frameGrid = animSeq.frames[frameIndex];
      const charSize = character.gridSize;
      const charScale = (TILE_DISPLAY_SIZE * 1.1) / charSize;

      const drawOffsetX = pX - (charSize * charScale) / 2;
      const drawOffsetY = pY - (charSize * charScale) / 2 - 4;

      for (let r = 0; r < charSize; r++) {
        for (let c = 0; c < charSize; c++) {
          const color = frameGrid[r][c];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(
              drawOffsetX + c * charScale,
              drawOffsetY + r * charScale,
              charScale + 0.5,
              charScale + 0.5
            );
          }
        }
      }
    }
  };

  const handleResetPos = () => {
    setPosX(CANVAS_WIDTH / 2);
    setPosY(CANVAS_HEIGHT / 2);
    posRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  };

  return (
    <div className="flex flex-col items-center gap-4 max-w-5xl mx-auto py-2 text-slate-200">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Sala de Prueba 2D Top-Down en Tiempo Real
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Controles: Flechas o WASD</span>
              <span aria-hidden="true">·</span>
              <span>Barra Espaciadora para atacar</span>
            </div>
          </div>
        </div>

        {/* Room Presets & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setRoomPreset('meadow')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                roomPreset === 'meadow'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pradera
            </button>
            <button
              onClick={() => setRoomPreset('dungeon')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                roomPreset === 'dungeon'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Calabozo
            </button>
          </div>

          <button
            onClick={handleResetPos}
            title="Reiniciar Posición"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Centrar</span>
          </button>
        </div>
      </div>

      {/* Main Playable Arena Canvas */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="pixelated block cursor-grab active:cursor-grabbing"
        />

        {/* Telemetry Overlay Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
          <span className="text-amber-400 font-bold uppercase">{direction}</span>
          <span className="text-slate-600">·</span>
          <span>{isWalking ? 'Caminando' : 'Reposo'}</span>
          <span className="text-slate-600">·</span>
          <span>X: {Math.round(posX)} Y: {Math.round(posY)}</span>
        </div>
      </div>

      {/* Mobile / Screen Touch Directional D-Pad */}
      <div className="flex items-center justify-center gap-2 sm:hidden pt-2">
        <div className="grid grid-cols-3 gap-1.5 w-44">
          <div />
          <button
            onMouseDown={() => (keysDownRef.current['arrowup'] = true)}
            onMouseUp={() => (keysDownRef.current['arrowup'] = false)}
            onTouchStart={() => (keysDownRef.current['arrowup'] = true)}
            onTouchEnd={() => (keysDownRef.current['arrowup'] = false)}
            className="p-3 bg-slate-800 rounded-lg text-center font-bold text-slate-200"
          >
            ↑
          </button>
          <div />
          <button
            onMouseDown={() => (keysDownRef.current['arrowleft'] = true)}
            onMouseUp={() => (keysDownRef.current['arrowleft'] = false)}
            onTouchStart={() => (keysDownRef.current['arrowleft'] = true)}
            onTouchEnd={() => (keysDownRef.current['arrowleft'] = false)}
            className="p-3 bg-slate-800 rounded-lg text-center font-bold text-slate-200"
          >
            ←
          </button>
          <button
            onClick={() => {
              setIsAttacking(true);
              setTimeout(() => setIsAttacking(false), 300);
            }}
            className="p-3 bg-amber-400 text-slate-950 rounded-lg text-center font-bold"
          >
            ⚔
          </button>
          <button
            onMouseDown={() => (keysDownRef.current['arrowright'] = true)}
            onMouseUp={() => (keysDownRef.current['arrowright'] = false)}
            onTouchStart={() => (keysDownRef.current['arrowright'] = true)}
            onTouchEnd={() => (keysDownRef.current['arrowright'] = false)}
            className="p-3 bg-slate-800 rounded-lg text-center font-bold text-slate-200"
          >
            →
          </button>
          <div />
          <button
            onMouseDown={() => (keysDownRef.current['arrowdown'] = true)}
            onMouseUp={() => (keysDownRef.current['arrowdown'] = false)}
            onTouchStart={() => (keysDownRef.current['arrowdown'] = true)}
            onTouchEnd={() => (keysDownRef.current['arrowdown'] = false)}
            className="p-3 bg-slate-800 rounded-lg text-center font-bold text-slate-200"
          >
            ↓
          </button>
          <div />
        </div>
      </div>
    </div>
  );
};
