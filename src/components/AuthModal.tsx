import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, Sparkles, CheckCircle2, AlertCircle, LogOut, Coins } from 'lucide-react';
import { pixelArtApi, AuthUserProfile } from '../services/pixelArtApi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfile: AuthUserProfile | null;
  onUserChange: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onUserChange,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor introduce un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    try {
      if (tab === 'register') {
        const user = await pixelArtApi.auth.register(email.trim(), displayName.trim() || undefined);
        setSuccessMsg(`¡Registro completado! Bienvenido, ${user.displayName || user.email}.`);
        onUserChange();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const user = await pixelArtApi.auth.login(email.trim());
        setSuccessMsg(`¡Sesión iniciada correctamente! Bienvenido de nuevo.`);
        onUserChange();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await pixelArtApi.auth.loginWithGoogle();
      setSuccessMsg('Sesión iniciada con Google.');
      onUserChange();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error iniciando sesión con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await pixelArtApi.auth.logout();
      setSuccessMsg('Has cerrado sesión.');
      onUserChange();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {currentUser ? 'Perfil de Usuario' : 'Autenticación & Cuenta'}
              </h3>
              <p className="text-[11px] text-slate-400">Pixel Art Studio · Cloud SQL PostgreSQL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {currentUser ? (
          /* Profile Information View */
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Usuario Activo:</span>
                <span className="text-xs font-bold text-white">{currentUser.displayName || currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Email:</span>
                <span className="text-xs font-mono text-slate-300">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Créditos de Generación:</span>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 font-mono">
                  <Coins className="w-3.5 h-3.5" />
                  {userProfile?.credits ?? 100} créditos
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                <span>UID:</span>
                <span className="font-mono text-[10px]">{currentUser.uid.slice(0, 16)}...</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          /* Login / Register Form */
          <div className="space-y-4">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tab === 'login' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tab === 'register' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre o Apodo:</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Pixel Artist"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@pixelart.studio"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {tab === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Registrando...' : 'Registrar Cuenta'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Iniciando...' : 'Acceder al Estudio'}</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-mono">o continúa con</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Workspace / Gmail</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
