import React, { useState, useEffect } from 'react';
import { 
  Library, 
  Users, 
  Box, 
  Film, 
  Grid, 
  Sparkles, 
  Download, 
  Trash2, 
  FolderOpen, 
  Filter, 
  Search,
  Plus
} from 'lucide-react';
import { AssetType, LibraryItem, PixelGrid } from '../types';
import { pixelArtApi } from '../services/pixelArtApi';

interface LibraryManagerProps {
  onLoadIntoCanvas: (grid: PixelGrid, name: string) => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({
  onLoadIntoCanvas,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLibrary();
  }, [selectedCategory]);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const data = await pixelArtApi.library.list(selectedCategory);
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (e) {
      console.warn('Fetch library error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este recurso de tu biblioteca?')) return;
    try {
      await pixelArtApi.library.delete(id);
      fetchLibrary();
    } catch (e) {
      console.error(e);
    }
  };

  const categories: { id: AssetType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todos', icon: <Library className="w-3.5 h-3.5" /> },
    { id: 'character', label: 'Personajes', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'object', label: 'Objetos & Props', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'animation', label: 'Animaciones', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'tileset', label: 'Tilesets', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'environment', label: 'Escenarios', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'ui', label: 'UI Assets', icon: <Library className="w-3.5 h-3.5" /> },
    { id: 'palette', label: 'Paletas', icon: <Library className="w-3.5 h-3.5" /> },
  ];

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (item.tags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-200 py-2 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Bibliotecas de Recursos Gráficos 2D
            </h2>
            <p className="text-xs text-slate-400">
              Colección organizada de personajes, animaciones, tilesets y props guardados en Cloud SQL.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o tag..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 outline-none"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          No hay recursos guardados en esta categoría. Puedes generar elementos con PixelLab V2 o crear sprites en el editor y guardarlos aquí.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl shadow-lg flex flex-col justify-between transition-all"
            >
              <div>
                <div className="w-full aspect-square checker-pattern rounded-lg border border-slate-800 p-2 flex items-center justify-center overflow-hidden mb-2">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="max-h-full pixelated object-contain" />
                  ) : (
                    <div className="text-[10px] text-slate-500 font-mono text-center">
                      {item.dimensions}
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-200 truncate">{item.name}</h4>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                  <span className="capitalize">{item.category}</span>
                  <span className="font-mono">{item.dimensions}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    let parsedData = item.data;
                    if (typeof parsedData === 'string') {
                      try { parsedData = JSON.parse(parsedData); } catch {}
                    }
                    if (Array.isArray(parsedData)) {
                      onLoadIntoCanvas(parsedData, item.name);
                    }
                  }}
                  className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium rounded text-[11px] transition-colors cursor-pointer text-center"
                >
                  Cargar
                </button>
                <button
                  onClick={() => item.id && handleDelete(item.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
