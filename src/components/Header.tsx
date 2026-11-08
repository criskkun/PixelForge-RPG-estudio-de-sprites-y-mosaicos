import React from 'react';
import { Download, Sparkles, Gamepad2, Layers, Palette, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'character' | 'tileset' | 'generator' | 'playtest';
  setActiveTab: (tab: 'character' | 'tileset' | 'generator' | 'playtest') => void;
  onOpenExport: () => void;
  characterName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExport,
  characterName,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-base shadow-sm">
          PF
        </div>
        <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
          PixelForge RPG
        </span>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('character')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'character'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Editor de Personaje</span>
        </button>

        <button
          onClick={() => setActiveTab('tileset')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'tileset'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tilesets &amp; Autotile</span>
        </button>

        <button
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'generator'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Generador IA &amp; Referencias</span>
        </button>

        <button
          onClick={() => setActiveTab('playtest')}
          className={`flex items-center gap-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'playtest'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Sala de Prueba 2D</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar a Godot / Unity</span>
        </button>
      </div>
    </header>
  );
};
