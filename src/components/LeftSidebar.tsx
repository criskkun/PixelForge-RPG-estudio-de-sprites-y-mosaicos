import React from 'react';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Palette, 
  Sparkles, 
  Users, 
  Box, 
  Film, 
  Grid, 
  Library, 
  Gamepad2, 
  Download, 
  Settings,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { AppView } from '../types';

interface LeftSidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  hasPixelLab: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentView,
  setCurrentView,
  user,
  onLogin,
  onLogout,
  hasPixelLab,
}) => {
  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'projects', label: 'Proyectos', icon: <FolderGit2 className="w-4 h-4" /> },
    { id: 'editor', label: 'Editor Pixel Art', icon: <Palette className="w-4 h-4" /> },
    { id: 'pixellab', label: 'Generador IA', icon: <Sparkles className="w-4 h-4 text-amber-400" />, badge: 'V2' },
    { id: 'characters', label: 'Personajes', icon: <Users className="w-4 h-4" /> },
    { id: 'objects', label: 'Objetos & Props', icon: <Box className="w-4 h-4" /> },
    { id: 'animations', label: 'Animaciones', icon: <Film className="w-4 h-4" /> },
    { id: 'tilesets', label: 'Tilesets & Mapas', icon: <Grid className="w-4 h-4" /> },
    { id: 'libraries', label: 'Bibliotecas', icon: <Library className="w-4 h-4" /> },
    { id: 'playtest', label: 'Sala de Prueba 2D', icon: <Gamepad2 className="w-4 h-4 text-emerald-400" /> },
    { id: 'export', label: 'Exportación', icon: <Download className="w-4 h-4" /> },
    { id: 'settings', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm shadow-sm">
            PA
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Pixel Art Studio</span>
            </h1>
            <p className="text-[10px] text-slate-500">PixelLab &amp; Godot / Unity</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-slate-950' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-amber-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User & Status Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
        {/* API connection indicator */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500 font-mono">
          <span>PixelLab V2:</span>
          <span className={hasPixelLab ? 'text-emerald-400 font-medium' : 'text-amber-400/80'}>
            {hasPixelLab ? 'Conectado' : 'Configurar'}
          </span>
        </div>

        {/* User Card */}
        {user ? (
          <div className="flex items-center justify-between p-2 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{user.displayName || user.email}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión (Google)</span>
          </button>
        )}
      </div>
    </aside>
  );
};
