import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Users, 
  Box, 
  Film, 
  RotateCw, 
  Edit3, 
  Grid, 
  Upload, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Key, 
  Layers, 
  Download,
  Coins,
  RefreshCw,
  History,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Palette,
  CloudUpload
} from 'lucide-react';
import { PixelGrid } from '../types';
import { pixelArtApi } from '../services/pixelArtApi';

interface PixelLabStudioProps {
  onLoadIntoCanvas: (grid: PixelGrid, name: string) => void;
  onSaveToLibrary: (asset: { name: string; category: string; data: any; thumbnail?: string; dimensions: string }) => void;
}

type PixelLabCategory = 'pixen' | 'characters' | 'images' | 'objects' | 'animations' | 'rotations' | 'editing' | 'maps';

export const PixelLabStudio: React.FC<PixelLabStudioProps> = ({
  onLoadIntoCanvas,
  onSaveToLibrary,
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');
  const [category, setCategory] = useState<PixelLabCategory>('pixen');
  const [operation, setOperation] = useState<string>('create-image-pixen');

  // Input Parameters
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState<number>(32);
  const [height, setHeight] = useState<number>(32);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [transparentBg, setTransparentBg] = useState(true);
  const [directionsCount, setDirectionsCount] = useState<4 | 8>(4);
  const [animationName, setAnimationName] = useState('walk');

  // Execution & Job Tracking
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<any[]>([]);

  // Server Token Status & Backend URL
  const [hasToken, setHasToken] = useState(false);
  const [backendUrl, setBackendUrl] = useState('https://api.pixellab.ai/v2');
  const [apiUrlInput, setApiUrlInput] = useState('https://api.pixellab.ai/v2');
  const [balance, setBalance] = useState<any | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Generation History from PostgreSQL
  const [dbHistory, setDbHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Operations map per category according to official PixelLab V2 specs
  const categoryOperations: Record<PixelLabCategory, { id: string; label: string; desc: string }[]> = {
    pixen: [
      { id: 'create-image-pixen', label: 'Create Image (Pixen) — Oficial V2', desc: 'Endpoint oficial: POST /create-image-pixen con autenticación Bearer' },
    ],
    images: [
      { id: 'generate-image-v2', label: 'Generate Image V2 (Pro)', desc: 'Generación de alta fidelidad profesional' },
      { id: 'generate-with-style-v2', label: 'Generate with Style V2', desc: 'Aplica el estilo exacto de una imagen de referencia' },
      { id: 'image-to-pixelart', label: 'Image to Pixel Art', desc: 'Convierte foto/dibujo en pixel art' },
      { id: 'image-to-pixelart-pro', label: 'Image to Pixel Art Pro', desc: 'Conversión avanzada con optimización de paleta' },
    ],
    characters: [
      { id: 'create-character-with-4-directions', label: 'Personaje 4 Direcciones (RPG)', desc: 'Abajo, Arriba, Izquierda, Derecha' },
      { id: 'create-character-with-8-directions', label: 'Personaje 8 Direcciones', desc: 'Rotación isométrica y cardinal completa' },
      { id: 'create-character-v3', label: 'Create Character V3', desc: 'Personaje canónico con 8 rotaciones' },
      { id: 'create-character-pro', label: 'Create Character Pro', desc: 'Generación Pro con detalles de armadura/ropa' },
      { id: 'create-character-state', label: 'Create Character State', desc: 'Añadir estado (agachado, herido, victorioso)' },
      { id: 'characters/animations', label: 'Character Animation', desc: 'Crear ciclo de animación para el personaje' },
      { id: 'animate-character', label: 'Animate Character', desc: 'Generar secuencia de fotogramas' },
    ],
    objects: [
      { id: 'create-1-direction-object', label: 'Objeto 1 Dirección (Top-Down)', desc: 'Cofres, pociones, árboles, mobiliario' },
      { id: 'create-8-direction-object', label: 'Objeto 8 Direcciones', desc: 'Vehículos, torretas, estatuas con rotación' },
      { id: 'objects/animations', label: 'Animar Objeto', desc: 'Antorchas ardiendo, puertas abriéndose' },
      { id: 'objects/states', label: 'Estados de Objeto', desc: 'Cofre abierto/cerrado, lámpara encendida/apagada' },
    ],
    animations: [
      { id: 'animate-with-text-v3', label: 'Animar con Texto V3', desc: 'Describe la acción ("atacar con espada", "lanzar hechizo")' },
      { id: 'animate-with-skeleton-v3', label: 'Animar con Esqueleto V3', desc: 'Control óseo preciso de extremidades' },
      { id: 'interpolation-v2', label: 'Interpolación V2', desc: 'Generar fotogramas intermedios (In-betweening)' },
      { id: 'edit-animation-v2', label: 'Editar Animación Pro', desc: 'Ajustar ritmo, capas o movimiento' },
    ],
    rotations: [
      { id: 'generate-8-rotations-v3', label: 'Generar 8 Rotaciones V3', desc: 'Calcula todas las direcciones a partir de 1 vista' },
      { id: 'rotate', label: 'Rotar Sprite', desc: 'Gira un sprite a un ángulo específico' },
    ],
    editing: [
      { id: 'edit-images-v2', label: 'Edit Images V2', desc: 'Modificación asistida de partes del sprite' },
      { id: 'edit-image-pixen', label: 'Edit Image Pixen', desc: 'Edición rápida en modelo Pixen' },
      { id: 'inpaint-v3', label: 'Inpaint V3', desc: 'Rellenar o sustituir áreas enmascaradas' },
    ],
    maps: [
      { id: 'create-tileset', label: 'Tileset Top-Down (Wang / 3x3)', desc: 'Terrenos conectables para RPG y mazmorras' },
      { id: 'create-tileset-sidescroller', label: 'Tileset Sidescroller (Plataformas)', desc: 'Superficies y techos 2D de scroll lateral' },
      { id: 'create-isometric-tile', label: 'Tile Isométrico', desc: 'Baldosas con proyección isométrica en diamante' },
      { id: 'map-objects', label: 'Objetos de Mapa', desc: 'Elementos arquitectónicos y ambientales' },
    ],
  };

  // Check PixelLab Status on Mount
  useEffect(() => {
    checkStatus();
    fetchHistory();
  }, []);

  const checkStatus = async () => {
    try {
      const data = await pixelArtApi.pixelLab.getStatus();
      setHasToken(data.configured);
      const url = data.apiUrl || 'https://api.pixellab.ai/v2';
      setBackendUrl(url);
      setApiUrlInput(url);
      setBalance(data.balance);
    } catch (e: any) {
      console.warn('Status error:', e);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await pixelArtApi.pixelLab.getHistory();
      if (Array.isArray(data)) {
        setDbHistory(data);
      }
    } catch (e: any) {
      console.warn('Fetch history error:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveToken = async () => {
    try {
      const payload: any = {};
      if (tokenInput.trim()) payload.apiKey = tokenInput.trim();
      if (apiUrlInput.trim()) payload.apiUrl = apiUrlInput.trim();

      const data = await pixelArtApi.configureBackend(payload);
      if (data.success) {
        setHasToken(Boolean(data.configured));
        if (data.apiUrl) {
          setBackendUrl(data.apiUrl);
          setApiUrlInput(data.apiUrl);
        }
        setShowTokenModal(false);
        checkStatus();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleImportToCanvas = async (imgUrl: string, name: string) => {
    try {
      setProgressMsg('Importando imagen y generando píxeles para el lienzo...');
      const grid = await pixelArtApi.editor.importImageToCanvas(imgUrl, (width || 32) as any);
      onLoadIntoCanvas(grid, name);
      setProgressMsg('¡Imagen importada con éxito al editor!');
      setTimeout(() => setProgressMsg(''), 1500);
    } catch (e: any) {
      setErrorMsg('Error al importar al lienzo: ' + e.message);
    }
  };

  const handleUploadToCloud = async (imgUrl: string, name: string) => {
    try {
      const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const file = await pixelArtApi.storage.upload({
        fileBase64: imgUrl,
        filename: `${cleanName}.png`,
        category: 'sprites',
      });
      alert(`¡Recurso guardado en Cloud Storage!\nNombre: ${file.originalName}\nTamaño: ${file.size} bytes\nURL: ${file.url}`);
    } catch (e: any) {
      setErrorMsg('Error al guardar en almacenamiento cloud: ' + e.message);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Generation to PixelLab V2 via Server Proxy
  const handleGenerate = async () => {
    if (!prompt.trim() && !referenceImage) {
      setErrorMsg('Por favor introduce una descripción (prompt) o adjunta una imagen de referencia.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setJobStatus(null);
    setProgressMsg('Enviando solicitud JSON con autenticación Bearer al servidor proxy...');

    try {
      let endpointUrl = '/api/pixellab/generate';
      let payloadBody: any;

      if (operation === 'create-image-pixen') {
        // Dedicated official route: POST /create-image-pixen
        endpointUrl = '/api/pixellab/create-image-pixen';
        payloadBody = {
          prompt: prompt.trim(),
          width,
          height,
          transparent: transparentBg,
          image: referenceImage || undefined,
          negative_prompt: negativePrompt.trim() || undefined,
        };
      } else {
        const params: any = {
          prompt: prompt.trim(),
          width,
          height,
          transparent: transparentBg,
        };
        if (referenceImage) {
          params.image = referenceImage;
          params.style_image_url = referenceImage;
        }
        if (operation.includes('character') || operation.includes('animate')) {
          params.directions = directionsCount;
          params.animation_name = animationName;
        }
        payloadBody = { operation, params };
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error en la solicitud a PixelLab V2');
      }

      const result = data.result;
      const jobId = data.jobId || result?.job_id || result?.id;

      if (jobId) {
        setCurrentJobId(jobId);
        setProgressMsg(`Petición aceptada por PixelLab. Seguimiento de Job ID: ${jobId}...`);
        pollJob(jobId);
      } else {
        setProgressMsg('Generación completada.');
        handleJobSuccess(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error procesando solicitud');
      setIsLoading(false);
      setProgressMsg('');
    }
  };

  // Poll Asynchronous Background Job until completed or failed
  const pollJob = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 40;

    const interval = setInterval(async () => {
      attempts++;
      try {
        setProgressMsg(`Consultando estado en PixelLab (${attempts}/${maxAttempts})...`);
        const res = await fetch(`/api/pixellab/job/${jobId}`);
        const data = await res.json();
        const status = data.status;

        setJobStatus(status);
        const normStatus = (status?.status || status?.state || '').toLowerCase();

        if (normStatus === 'completed' || normStatus === 'success') {
          clearInterval(interval);
          setIsLoading(false);
          setProgressMsg('¡Generación finalizada con éxito en PixelLab!');
          handleJobSuccess(status.result || status);
          fetchHistory();
        } else if (normStatus === 'failed' || normStatus === 'error' || normStatus === 'failure') {
          clearInterval(interval);
          setIsLoading(false);
          setProgressMsg('');
          setErrorMsg(status?.error || 'El trabajo en PixelLab falló. Puedes reintentar.');
          fetchHistory();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsLoading(false);
          setProgressMsg('');
          setErrorMsg('Tiempo de espera agotado. El trabajo sigue procesándose en PixelLab.');
          fetchHistory();
        }
      } catch (e: any) {
        clearInterval(interval);
        setIsLoading(false);
        setProgressMsg('');
        setErrorMsg(e.message || 'Error al consultar estado del trabajo en PixelLab');
      }
    }, 2500);
  };

  const handleJobSuccess = (resultData: any) => {
    setIsLoading(false);
    const imgUrl = resultData?.image_url || resultData?.url || resultData?.spritesheet_url || resultData?.images?.[0] || null;
    const newEntry = {
      id: Date.now(),
      prompt: prompt || 'Generación PixelLab',
      operation,
      data: resultData,
      imageUrl: imgUrl,
      frames: resultData?.frames || null,
      createdAt: new Date().toISOString(),
    };
    setGeneratedResults(prev => [newEntry, ...prev]);
  };

  // Retry generation
  const handleRetryJob = async (jobId: string, itemPrompt?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setProgressMsg(`Reintentando generación para Job ID: ${jobId}...`);
    try {
      const res = await fetch(`/api/pixellab/retry/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'No se pudo reintentar la generación.');
      }
      const newJobId = data.newJobId;
      setCurrentJobId(newJobId);
      pollJob(newJobId);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message);
      setProgressMsg('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-200 py-2 select-none">
      {/* Header with Balance, Backend URL & API Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>PixelLab AI Engine V2</span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                API Oficial
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Backend:</span>
              <span className="text-slate-300 font-mono text-[11px]">{backendUrl}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <ShieldCheck className="w-3 h-3" /> Servidor Proxy Seguro
              </span>
            </div>
          </div>
        </div>

        {/* API Token & Balance Pill */}
        <div className="flex items-center gap-2">
          {hasToken ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Créditos: {balance?.credits ?? balance?.balance ?? 'Activo'}</span>
              <button
                onClick={() => setShowTokenModal(true)}
                className="ml-1 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 cursor-pointer"
                title="Configurar URL y Token"
              >
                <Key className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTokenModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Configurar Token PIXELLAB_API_KEY</span>
            </button>
          )}

          <button
            onClick={() => {
              checkStatus();
              fetchHistory();
            }}
            title="Refrescar estado e historial"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tab Switcher: Generator vs History */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generador de Recursos</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Generaciones (Cloud SQL)</span>
            {dbHistory.length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'history' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
              }`}>
                {dbHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 text-rose-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: GENERATOR */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          {/* Category Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'pixen' as PixelLabCategory, label: 'Pixen (Endpoint Oficial)', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
              { id: 'characters' as PixelLabCategory, label: 'Personajes', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'images' as PixelLabCategory, label: 'Imágenes', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'objects' as PixelLabCategory, label: 'Objetos & Props', icon: <Box className="w-3.5 h-3.5" /> },
              { id: 'animations' as PixelLabCategory, label: 'Animaciones', icon: <Film className="w-3.5 h-3.5" /> },
              { id: 'rotations' as PixelLabCategory, label: 'Rotaciones', icon: <RotateCw className="w-3.5 h-3.5" /> },
              { id: 'editing' as PixelLabCategory, label: 'Edición & Inpaint', icon: <Edit3 className="w-3.5 h-3.5" /> },
              { id: 'maps' as PixelLabCategory, label: 'Tilesets & Mapas', icon: <Grid className="w-3.5 h-3.5" /> },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setOperation(categoryOperations[cat.id][0].id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  category === cat.id
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Main Studio Split (Config on Left, Results on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Generator Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
                {/* Operation Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Operación PixelLab V2:
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      POST {backendUrl}/{operation}
                    </span>
                  </div>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-semibold outline-none cursor-pointer"
                  >
                    {categoryOperations[category].map(op => (
                      <option key={op.id} value={op.id}>
                        {op.label} — {op.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prompt Textarea */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Descripción / Prompt para PixelLab:
                  </label>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej. Espada legendaria de fuego místico con empuñadura dorada, arte de píxeles nítido para RPG..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
                  />
                </div>

                {/* Optional Negative Prompt for Pixen */}
                {operation === 'create-image-pixen' && (
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">
                      Prompt Negativo (Opcional):
                    </label>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="blurry, distorted, 3d, photographic, low quality..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none"
                    />
                  </div>
                )}

                {/* Dimensions & Directions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Ancho (px):
                    </label>
                    <select
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none"
                    >
                      {[16, 24, 32, 48, 64, 128].map(sz => (
                        <option key={sz} value={sz}>{sz}px</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Alto (px):
                    </label>
                    <select
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none"
                    >
                      {[16, 24, 32, 48, 64, 128].map(sz => (
                        <option key={sz} value={sz}>{sz}px</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Rotaciones:
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDirectionsCount(4)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          directionsCount === 4 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        4-Dir
                      </button>
                      <button
                        onClick={() => setDirectionsCount(8)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          directionsCount === 8 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        8-Dir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference Image Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Imagen de Referencia (Image-to-Image / Style):
                    </label>
                    {referenceImage && (
                      <button
                        onClick={() => setReferenceImage(null)}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-amber-400/60 rounded-xl p-3 flex items-center justify-center bg-slate-950/40">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {referenceImage ? (
                      <div className="flex items-center gap-3">
                        <img src={referenceImage} alt="Reference" className="w-12 h-12 rounded object-contain border border-slate-700 bg-slate-900" />
                        <span className="text-xs text-amber-300 font-medium">Referencia lista para enviar en JSON</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Upload className="w-4 h-4" />
                        <span>Arrastra o haz clic para subir referencia</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transparency Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-300">Fondo Transparente (PNG Alpha):</span>
                  <input
                    type="checkbox"
                    checked={transparentBg}
                    onChange={(e) => setTransparentBg(e.target.checked)}
                    className="accent-amber-400 w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoading ? 'Generando en PixelLab V2...' : `Enviar a PixelLab (${operation})`}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Job Status & Results Gallery (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Active Job Tracker & Progress Message */}
              {isLoading && (
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Estado del Trabajo
                      </span>
                    </div>
                    {currentJobId && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Job: {currentJobId.slice(0, 16)}...
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-normal">
                    {progressMsg || 'Procesando en PixelLab API V2...'}
                  </p>

                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              )}

              {/* Current Session Results Gallery */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Resultados de la Sesión ({generatedResults.length})
                </span>

                {generatedResults.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Aún no has generado recursos en esta sesión. Selecciona una operación y presiona Enviar a PixelLab.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {generatedResults.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200 truncate">{item.prompt}</span>
                          <span className="text-[10px] text-amber-400 font-mono">{item.operation}</span>
                        </div>

                        {/* Preview box */}
                        <div className="w-full aspect-video rounded-lg checker-pattern border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="Result" className="max-h-full pixelated object-contain" />
                          ) : (
                            <div className="text-xs text-slate-500 font-mono text-center">
                              Resultado procesado correctamente
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {item.imageUrl && (
                            <button
                              onClick={() => handleImportToCanvas(item.imageUrl, item.prompt || 'Sprite PixelLab')}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                              title="Importar al Editor de Píxeles"
                            >
                              <Palette className="w-3.5 h-3.5" />
                              <span>Importar al Editor</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSaveToLibrary({
                                name: item.prompt,
                                category: 'character',
                                dimensions: `${width}x${height}`,
                                data: item.data,
                                thumbnail: item.imageUrl,
                              });
                            }}
                            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center"
                          >
                            Biblioteca
                          </button>

                          {item.imageUrl && (
                            <>
                              <button
                                onClick={() => handleUploadToCloud(item.imageUrl, item.prompt || 'pixellab_asset')}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                                title="Subir a Cloud Storage"
                              >
                                <CloudUpload className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={item.imageUrl}
                                download={`pixellab_${Date.now()}.png`}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                                title="Descargar imagen"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: GENERATION HISTORY (Persisted in PostgreSQL) */}
      {activeTab === 'history' && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>Historial de Trabajos en PostgreSQL (Cloud SQL)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Registro persistente de todas las solicitudes y estados de generación con PixelLab API V2.
              </p>
            </div>

            <button
              onClick={fetchHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar Historial</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Cargando historial desde Cloud SQL...
            </div>
          ) : dbHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Aún no hay registros de generación en la base de datos.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {dbHistory.map((job) => {
                let parsedResult: any = null;
                try {
                  parsedResult = job.resultData ? JSON.parse(job.resultData) : null;
                } catch {}

                const imgUrl = parsedResult?.image_url || parsedResult?.url || parsedResult?.images?.[0] || null;
                const isCompleted = job.status === 'completed' || job.status === 'success';
                const isFailed = job.status === 'failed' || job.status === 'error';

                return (
                  <div key={job.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Thumbnail or status icon */}
                      <div className="w-12 h-12 rounded-lg checker-pattern border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} alt="Thumbnail" className="max-w-full max-h-full pixelated object-contain" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isFailed ? (
                          <XCircle className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white truncate max-w-md">
                            {job.prompt || 'Generación PixelLab'}
                          </p>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                            isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            isFailed ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <span className="font-mono text-amber-300">{job.endpoint}</span>
                          <span>·</span>
                          <span className="font-mono">ID: {job.jobId}</span>
                          <span>·</span>
                          <span>{new Date(job.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isFailed && (
                        <button
                          onClick={() => handleRetryJob(job.jobId, job.prompt)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reintentar</span>
                        </button>
                      )}

                      {imgUrl && (
                        <>
                          <button
                            onClick={() => handleImportToCanvas(imgUrl, job.prompt || 'Sprite PixelLab')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                            title="Importar imagen al Editor de Píxeles"
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>Importar al Editor</span>
                          </button>

                          <button
                            onClick={() => handleUploadToCloud(imgUrl, job.prompt || `pixellab_${job.jobId}`)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                            title="Guardar en Cloud Storage"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={imgUrl}
                            download={`pixellab_${job.jobId}.png`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                            title="Descargar imagen"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => {
                              onSaveToLibrary({
                                name: job.prompt || 'Recurso PixelLab',
                                category: 'character',
                                dimensions: '32x32',
                                data: parsedResult,
                                thumbnail: imgUrl,
                              });
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                          >
                            Biblioteca
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Token Configuration Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Configurar PIXELLAB_API_KEY</span>
              </h3>
              <button onClick={() => setShowTokenModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configura tu servidor independiente o el endpoint oficial de PixelLab V2. Las peticiones se realizan de forma exclusiva desde el servidor Node.js sin exponer credenciales al cliente.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    URL del Backend V2 (PIXEL_ART_API_URL):
                  </label>
                  <button
                    type="button"
                    onClick={() => setApiUrlInput('https://api.pixellab.ai/v2')}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Por defecto
                  </button>
                </div>
                <input
                  type="text"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  placeholder="https://api.pixellab.ai/v2"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  API Bearer Token (PIXELLAB_API_KEY):
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Bearer token de PixelLab..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Se envía automáticamente en la cabecera <code>Authorization: Bearer &lt;TOKEN&gt;</code>.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveToken}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
