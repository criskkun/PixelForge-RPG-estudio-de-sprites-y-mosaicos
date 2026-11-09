import React, { useState } from 'react';
import { 
  FolderPlus, 
  FolderOpen, 
  Save, 
  Undo2, 
  Redo2, 
  Upload, 
  Download, 
  Check, 
  Sparkles,
  Layers
} from 'lucide-react';
import { ProjectData } from '../types';

interface TopBarProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onNewProject: () => void;
  onOpenProjects: () => void;
  onSaveProject: () => void;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExport: () => void;
  onImportImage: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  setProject,
  onNewProject,
  onOpenProjects,
  onSaveProject,
  isSaving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExport,
  onImportImage,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 select-none shrink-0">
      {/* Project Title & Status */}
      <div className="flex items-center gap-3">
        {isEditingTitle ? (
          <input
            type="text"
            value={project.name}
            autoFocus
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
            onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
            className="px-2 py-1 bg-slate-950 border border-amber-400 rounded-lg text-xs font-bold text-white outline-none w-48"
          />
        ) : (
          <h2
            onClick={() => setIsEditingTitle(true)}
            title="Clic para renombrar"
            className="text-xs font-bold text-white hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800/80"
          >
            <span>{project.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">({project.width}x{project.height})</span>
          </h2>
        )}

        <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-500">
          <span>{project.layers.length} capas</span>
        </div>
      </div>

      {/* Middle: Standard File Actions (New, Open, Save, Undo, Redo, Import) */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onNewProject}
          title="Nuevo Proyecto"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Nuevo</span>
        </button>

        <button
          onClick={onOpenProjects}
          title="Abrir Proyectos"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Abrir</span>
        </button>

        <button
          onClick={onSaveProject}
          disabled={isSaving}
          title="Guardar en Cloud SQL"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer (Ctrl+Z)"
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Rehacer (Ctrl+Y)"
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onImportImage}
          title="Importar Imagen / Paleta"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Importar</span>
        </button>
      </div>

      {/* Right: Primary Action (Export to Engines) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar a Motores</span>
        </button>
      </div>
    </header>
  );
};
