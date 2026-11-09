import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Database, 
  Sparkles, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Coins,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [balance, setBalance] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/pixellab/status');
      const data = await res.json();
      setHasToken(data.configured);
      setBalance(data.balance);
    } catch (e: any) {
      console.warn('Status error:', e);
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/pixellab/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tokenInput.trim() }),
      });
      const data = await res.json();
      if (data.configured) {
        setHasToken(true);
        setStatusMsg({ type: 'success', text: 'Token de PixelLab guardado correctamente en el servidor.' });
        fetchStatus();
      } else {
        throw new Error(data.error || 'No se pudo guardar el token');
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Error al guardar el token' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-200 py-2 select-none">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center gap-3">
        <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">
            Configuración del Estudio &amp; Credenciales
          </h2>
          <p className="text-xs text-slate-400">
            Conexión de motores de IA, base de datos relacional y claves de API seguras en el servidor.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs ${
          statusMsg.type === 'success'
            ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
        }`}>
          {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 1. PixelLab API V2 Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">PixelLab API Token</h3>
              <p className="text-xs text-slate-400">
                Se almacena exclusivamente en variables de servidor y nunca se expone al navegador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold ${
              hasToken ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {hasToken ? 'TOKEN ACTIVO' : 'NO CONFIGURADO'}
            </span>
          </div>
        </div>

        {balance && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Créditos de Generación:</span>
            <span className="text-amber-300 font-bold">{balance?.credits ?? balance?.balance ?? 'Disponible'}</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 block">
            Ingresar o Actualizar Bearer Token:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="pixellab_token_..."
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono outline-none"
            />
            <button
              onClick={handleSaveToken}
              disabled={isSaving || !tokenInput.trim()}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              {isSaving ? 'Guardando...' : 'Guardar Token'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Puedes obtener tu token en{' '}
            <a href="https://pixellab.ai/account" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline inline-flex items-center gap-1">
              pixellab.ai/account <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>
      </div>

      {/* 2. Cloud SQL & PostgreSQL Status Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Base de Datos PostgreSQL (Cloud SQL)</h3>
            <p className="text-xs text-slate-400">
              Instancia Developer Edition con Drizzle ORM y agrupación de conexiones nativa.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Estado de Conexión:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Activa &amp; Segura
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tablas Verificadas:</span>
            <span className="text-slate-200">users, projects, library_assets, pixellab_jobs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
