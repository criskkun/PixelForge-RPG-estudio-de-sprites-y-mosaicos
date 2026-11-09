import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Plus, 
  FolderOpen, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  Clock, 
  AlertCircle,
  FileCode,
  Check
} from 'lucide-react';
import { ProjectData, GridSize } from '../types';
import { createDefaultLayers } from '../utils/layerUtils';
import { RPG_PALETTES } from '../utils/palettes';
import { pixelArtApi } from '../services/pixelArtApi';

interface ProjectsManagerProps {
  currentProject: ProjectData;
  onLoadProject: (proj: ProjectData) => void;
  onProjectSaved: () => void;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  currentProject,
  onLoadProject,
  onProjectSaved,
}) => {
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('Nuevo Proyecto RPG');
  const [newDesc, setNewDesc] = useState('');
  const [newSize, setNewSize] = useState<GridSize>(32);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await pixelArtApi.projects.list();
      if (Array.isArray(data)) {
        setProjectsList(data);
      }
    } catch (err: any) {
      console.warn('Fetch projects error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newName.trim()) return;
    const defaultLayers = createDefaultLayers(newSize);

    const projectPayload: ProjectData = {
      name: newName.trim(),
      description: newDesc.trim(),
      width: newSize,
      height: newSize,
      palette: RPG_PALETTES[0].colors,
      layers: defaultLayers,
      animations: {},
    };

    try {
      const saved = await pixelArtApi.projects.saveDocument(projectPayload);
      onLoadProject(saved);
      setShowCreateModal(false);
      fetchProjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear proyecto');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto de la base de datos?')) return;
    try {
      await pixelArtApi.projects.delete(id);
      fetchProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDuplicateProject = async (proj: any) => {
    const payload = {
      ...proj,
      id: undefined,
      name: `${proj.name} (Copia)`,
    };
    try {
      await pixelArtApi.projects.saveDocument(payload);
      fetchProjects();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleExportJson = (proj: any) => {
    const jsonStr = JSON.stringify(proj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.name.replace(/\s+/g, '_')}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-200 py-2 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Gestión de Proyectos (Cloud SQL / PostgreSQL)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Almacenamiento persistente en base de datos relacional para capas, paletas, fotogramas y recursos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Proyecto</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Project Card */}
        <div className="p-4 bg-slate-900 border-2 border-amber-400/70 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400 text-slate-950 rounded text-[9px] font-bold">
            PROYECTO ACTIVO
          </div>
          <div>
            <span className="text-[10px] text-amber-400 font-mono font-semibold uppercase">
              {currentProject.width}x{currentProject.height} px
            </span>
            <h3 className="text-sm font-bold text-white mt-1">{currentProject.name}</h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {currentProject.description || 'Proyecto abierto actualmente en el editor.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>{currentProject.layers.length} capas configuradas</span>
            <span className="text-emerald-400 font-medium">En Memoria</span>
          </div>
        </div>

        {/* Database Stored Projects */}
        {projectsList.map((proj) => (
          <div
            key={proj.id}
            className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-lg flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">
                  {proj.width}x{proj.height} px
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-200 mt-1">{proj.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {proj.description || 'Sin descripción'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-1">
              <button
                onClick={() => {
                  try {
                    const parsed = {
                      ...proj,
                      layers: typeof proj.layers === 'string' ? JSON.parse(proj.layers) : proj.layers,
                      palette: typeof proj.palette === 'string' ? JSON.parse(proj.palette) : proj.palette,
                      animations: typeof proj.animations === 'string' ? JSON.parse(proj.animations) : proj.animations,
                    };
                    onLoadProject(parsed);
                  } catch (e) {
                    onLoadProject(proj);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Abrir</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicateProject(proj)}
                  title="Duplicar proyecto"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExportJson(proj)}
                  title="Exportar archivo JSON"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteProject(proj.id)}
                  title="Eliminar proyecto"
                  className="p-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-amber-400" />
              <span>Crear Nuevo Proyecto Pixel Art</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Nombre del Proyecto:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Descripción:</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detalles sobre personajes, tilesets o resolución..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Dimensiones de Lienzo:</label>
                <div className="grid grid-cols-4 gap-2">
                  {([16, 24, 32, 48, 64] as GridSize[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setNewSize(sz)}
                      className={`py-2 rounded-lg font-mono font-bold cursor-pointer ${
                        newSize === sz ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {sz}x{sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Crear Proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
