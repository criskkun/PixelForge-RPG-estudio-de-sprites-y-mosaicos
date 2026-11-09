import React from 'react';
import { 
  FolderGit2, 
  Sparkles, 
  Palette, 
  Layers, 
  Gamepad2, 
  Download, 
  Coins, 
  ArrowRight,
  Plus,
  ShieldCheck,
  Database
} from 'lucide-react';
import { AppView, ProjectData } from '../types';

interface DashboardViewProps {
  setCurrentView: (view: AppView) => void;
  currentProject: ProjectData;
  hasPixelLab: boolean;
  onNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setCurrentView,
  currentProject,
  hasPixelLab,
  onNewProject,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-200 py-2 select-none">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded-full font-mono font-bold">
              ESTUDIO PROFESIONAL
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full font-mono">
              PostgreSQL Conectado
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Pixel Art Studio &amp; AI Engine
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Crea, anima y exporta sprites, tilesets y objetos para videojuegos 2D con PixelLab API V2 y exportación directa para Godot 4 y Unity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('editor')}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
          >
            <Palette className="w-4 h-4" />
            <span>Abrir Lienzo Pixel Art</span>
          </button>
          <button
            onClick={() => setCurrentView('pixellab')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Generador IA V2</span>
          </button>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Project */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Proyecto Actual</span>
              <FolderGit2 className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white mt-2">{currentProject.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Resolución: {currentProject.width}x{currentProject.height} px · {currentProject.layers.length} capas
            </p>
          </div>
          <button
            onClick={() => setCurrentView('editor')}
            className="mt-4 flex items-center justify-between text-xs text-amber-400 hover:text-amber-300 font-medium pt-3 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Continuar editando</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: PixelLab AI Status */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Motor PixelLab V2</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${hasPixelLab ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-sm font-bold text-white">
                {hasPixelLab ? 'API Lista & Conectada' : 'Token Pendiente'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Generación de 4 y 8 direcciones, esqueletos, inpainting y tilesets.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('pixellab')}
            className="mt-4 flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 font-medium pt-3 border-t border-slate-800/80 cursor-pointer"
          >
            <span>{hasPixelLab ? 'Ir al generador' : 'Configurar Token'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Game Engine Export */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Exportadores Directos</span>
              <Download className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white mt-2">Godot 4 &amp; Unity 2D</h3>
            <p className="text-xs text-slate-400 mt-1">
              Paquetes ZIP con SpriteFrames, escenas .tscn, metadatos Unity .meta y controladores de movimiento.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('export')}
            className="mt-4 flex items-center justify-between text-xs text-emerald-400 hover:text-emerald-300 font-medium pt-3 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Configurar exportación</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modules shortcuts */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Módulos Principales del Estudio
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setCurrentView('characters')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-200 block">Personajes 4-Dir</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Caminata, idle y combate</span>
          </button>
          <button
            onClick={() => setCurrentView('tilesets')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-200 block">Tilesets &amp; Autotile</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Reglas Wang 3x3 para RPG</span>
          </button>
          <button
            onClick={() => setCurrentView('playtest')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-200 block">Sala de Prueba 2D</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Juega en tiempo real con WASD</span>
          </button>
          <button
            onClick={() => setCurrentView('libraries')}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-200 block">Bibliotecas Cloud</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Almacenadas en PostgreSQL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
