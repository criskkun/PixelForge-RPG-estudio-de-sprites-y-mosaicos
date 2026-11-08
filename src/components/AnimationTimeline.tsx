import React, { useState, useEffect } from 'react';
import { Play, Pause, Plus, Copy, Trash2, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { Direction, AnimationType, PixelGrid, CharacterSheet } from '../types';
import { cloneGrid, createEmptyGrid } from '../utils/defaultAssets';

interface AnimationTimelineProps {
  character: CharacterSheet;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterSheet>>;
  currentDirection: Direction;
  setCurrentDirection: (dir: Direction) => void;
  currentAnimType: AnimationType;
  setCurrentAnimType: (type: AnimationType) => void;
  activeFrameIndex: number;
  setActiveFrameIndex: (idx: number) => void;
  currentGrid: PixelGrid;
  onUpdateCurrentFrame: (grid: PixelGrid) => void;
}

export const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  character,
  setCharacter,
  currentDirection,
  setCurrentDirection,
  currentAnimType,
  setCurrentAnimType,
  activeFrameIndex,
  setActiveFrameIndex,
  currentGrid,
  onUpdateCurrentFrame,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewFrameIdx, setPreviewFrameIdx] = useState(0);

  const animKey = `${currentAnimType}_${currentDirection}` as keyof CharacterSheet['animations'];
  const currentSequence = character.animations[animKey] || {
    name: animKey,
    fps: 6,
    frames: [currentGrid],
  };

  const frames = currentSequence.frames;
  const fps = currentSequence.fps || 6;

  // Animation Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      setPreviewFrameIdx(activeFrameIndex);
      return;
    }

    const intervalMs = Math.round(1000 / fps);
    const timer = setInterval(() => {
      setPreviewFrameIdx(prev => (prev + 1) % frames.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, fps, frames.length, activeFrameIndex]);

  // When paused, sync preview with active frame
  useEffect(() => {
    if (!isPlaying) {
      setPreviewFrameIdx(activeFrameIndex);
    }
  }, [activeFrameIndex, isPlaying]);

  const handleFpsChange = (newFps: number) => {
    setCharacter(prev => {
      const updated = { ...prev };
      const seq = updated.animations[animKey];
      if (seq) {
        updated.animations[animKey] = { ...seq, fps: newFps };
      }
      return updated;
    });
  };

  const handleAddFrame = () => {
    const newFrame = createEmptyGrid(character.gridSize);
    setCharacter(prev => {
      const updated = { ...prev };
      const seq = updated.animations[animKey];
      if (seq) {
        updated.animations[animKey] = {
          ...seq,
          frames: [...seq.frames, newFrame],
        };
      }
      return updated;
    });
    setActiveFrameIndex(frames.length);
  };

  const handleDuplicateFrame = () => {
    const duplicated = cloneGrid(frames[activeFrameIndex] || currentGrid);
    setCharacter(prev => {
      const updated = { ...prev };
      const seq = updated.animations[animKey];
      if (seq) {
        const newFrames = [...seq.frames];
        newFrames.splice(activeFrameIndex + 1, 0, duplicated);
        updated.animations[animKey] = {
          ...seq,
          frames: newFrames,
        };
      }
      return updated;
    });
    setActiveFrameIndex(activeFrameIndex + 1);
  };

  const handleDeleteFrame = () => {
    if (frames.length <= 1) return;
    setCharacter(prev => {
      const updated = { ...prev };
      const seq = updated.animations[animKey];
      if (seq) {
        const newFrames = seq.frames.filter((_, idx) => idx !== activeFrameIndex);
        updated.animations[animKey] = {
          ...seq,
          frames: newFrames,
        };
      }
      return updated;
    });
    setActiveFrameIndex(Math.max(0, activeFrameIndex - 1));
  };

  const directions: { id: Direction; label: string; icon: string }[] = [
    { id: 'down', label: 'Abajo (Frontal)', icon: '↓' },
    { id: 'left', label: 'Izquierda', icon: '←' },
    { id: 'right', label: 'Derecha', icon: '→' },
    { id: 'up', label: 'Arriba (Espalda)', icon: '↑' },
  ];

  const animTypes: { id: AnimationType; label: string }[] = [
    { id: 'walk', label: 'Caminar' },
    { id: 'idle', label: 'Reposo (Idle)' },
    { id: 'attack', label: 'Ataque' },
  ];

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
    <div className="flex flex-col gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 shadow-xl">
      {/* Top Bar: Direction Tabs & State Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Direction Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <Compass className="w-4 h-4 text-amber-400 ml-1.5 mr-0.5" />
          {directions.map(dir => (
            <button
              key={dir.id}
              onClick={() => {
                setCurrentDirection(dir.id);
                setActiveFrameIndex(0);
              }}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentDirection === dir.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{dir.icon}</span>
              <span>{dir.label}</span>
            </button>
          ))}
        </div>

        {/* Animation State Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          {animTypes.map(at => (
            <button
              key={at.id}
              onClick={() => {
                setCurrentAnimType(at.id);
                setActiveFrameIndex(0);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentAnimType === at.id
                  ? 'bg-slate-800 text-amber-300 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {at.label}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Bar: Playback Controls & Frame Reel */}
      <div className="flex items-center gap-4">
        {/* Real-time Animated Preview Box */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-16 h-16 rounded-xl checker-pattern border border-slate-700 p-1 flex items-center justify-center shadow-inner overflow-hidden">
            {frames[previewFrameIdx] ? renderThumbnail(frames[previewFrameIdx]) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(prev => !prev)}
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer ${
                isPlaying
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title={isPlaying ? 'Pausar' : 'Reproducir Animación'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* FPS Control */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              <span>{fps} FPS</span>
            </div>
          </div>
        </div>

        {/* Frames Timeline Ribbon */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-2 px-1">
          {frames.map((frame, idx) => (
            <div
              key={idx}
              onClick={() => {
                setIsPlaying(false);
                setActiveFrameIndex(idx);
              }}
              className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
                activeFrameIndex === idx
                  ? 'ring-2 ring-amber-400 bg-amber-500/10'
                  : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="w-14 h-14 rounded-lg checker-pattern p-1 flex items-center justify-center overflow-hidden">
                {renderThumbnail(frame)}
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Frame {idx + 1}
              </span>
            </div>
          ))}

          {/* Add Frame Button */}
          <button
            onClick={handleAddFrame}
            title="Añadir Nuevo Cuadro"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border border-dashed border-slate-700 hover:border-amber-400 text-slate-500 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">Añadir</span>
          </button>
        </div>

        {/* Frame Action Buttons */}
        <div className="flex flex-col gap-1.5 shrink-0 border-l border-slate-800 pl-4">
          <button
            onClick={handleDuplicateFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicar Cuadro</span>
          </button>

          <button
            onClick={handleDeleteFrame}
            disabled={frames.length <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/50 rounded-lg text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Cuadro</span>
          </button>

          {/* FPS Slider */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400">Velocidad:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={fps}
              onChange={e => handleFpsChange(parseInt(e.target.value, 10))}
              className="w-20 accent-amber-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
