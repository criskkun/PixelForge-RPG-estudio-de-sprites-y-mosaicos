import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Wand2, 
  Image as ImageIcon, 
  Sliders, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Cpu,
  Layers,
  Palette
} from 'lucide-react';
import { RenderStyle, GridSize, AssetType, CharacterSheet, TilesetSheet } from '../types';
import { RPG_PALETTES } from '../utils/palettes';
import { pixelateImage, synthesizeCharacterFromBase, synthesizeTilesetFromBase } from '../utils/pixelator';

interface ReferenceGeneratorProps {
  onApplyCharacter: (char: CharacterSheet) => void;
  onApplyTileset: (tileset: TilesetSheet) => void;
  currentStyle: RenderStyle;
  setCurrentStyle: (style: RenderStyle) => void;
  gridSize: GridSize;
  setGridSize: (size: GridSize) => void;
  assetType: AssetType;
  setAssetType: (type: AssetType) => void;
}

// Preset reference images (Data URLs or SVGs rendered to pixel reference)
const PRESET_REFERENCES = [
  {
    id: 'knight',
    name: 'Paladín Heroico',
    type: 'character' as AssetType,
    style: '16bit-snes' as RenderStyle,
    colorHex: '#3888c8',
    description: 'Armadura medieval con capa y yelmo cerrado.',
  },
  {
    id: 'sorceress',
    name: 'Maga Elemental',
    type: 'character' as AssetType,
    style: 'gba-pokemon' as RenderStyle,
    colorHex: '#7928ca',
    description: 'Túnica mística con orbe flotante y capucha.',
  },
  {
    id: 'dungeon_wall',
    name: 'Muro de Calabozo',
    type: 'tileset' as AssetType,
    style: 'dark-gothic' as RenderStyle,
    colorHex: '#5a7e72',
    description: 'Paredes de piedra antigua con musgo y ladrillo tallado.',
  },
  {
    id: 'overworld_grass',
    name: 'Pradera RPG',
    type: 'tileset' as AssetType,
    style: '16bit-snes' as RenderStyle,
    colorHex: '#48a838',
    description: 'Pasto vibrante con flores silvestres y transición a tierra.',
  },
  {
    id: 'cyber_agent',
    name: 'Agente Cibernético',
    type: 'character' as AssetType,
    style: 'cyberpunk' as RenderStyle,
    colorHex: '#00f0ff',
    description: 'Traje táctico con visor de neón e implantes sintéticos.',
  },
];

export const ReferenceGenerator: React.FC<ReferenceGeneratorProps> = ({
  onApplyCharacter,
  onApplyTileset,
  currentStyle,
  setCurrentStyle,
  gridSize,
  setGridSize,
  assetType,
  setAssetType,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pixelation Settings
  const [removeBg, setRemoveBg] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(25);
  const [dithering, setDithering] = useState<'none' | 'bayer' | 'floyd'>('bayer');
  const [outlineEnhance, setOutlineEnhance] = useState(true);
  const [contrastBoost, setContrastBoost] = useState(15);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor sube un archivo de imagen válido (PNG, JPG o WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Convert preset to sample image canvas
  const handleSelectPreset = (preset: typeof PRESET_REFERENCES[0]) => {
    setCurrentStyle(preset.style);
    setAssetType(preset.type);
    setPromptText(`${preset.name} - ${preset.description}`);

    // Generate an illustrative canvas for the preset
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw stylized gradient icon
      const grad = ctx.createLinearGradient(0, 0, 128, 128);
      grad.addColorStop(0, preset.colorHex);
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(64, 64, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = preset.colorHex;
      ctx.beginPath();
      ctx.arc(64, 50, 22, 0, Math.PI * 2);
      ctx.fill();

      setImageSrc(canvas.toDataURL('image/png'));
    }
  };

  // Direct algorithmic pixelation
  const handleInstantPixelate = async () => {
    if (!imageSrc) {
      setErrorMessage('Primero sube una imagen de referencia o selecciona un preset.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const pixelGrid = await pixelateImage(imageSrc, {
        gridSize,
        style: currentStyle,
        dithering,
        removeBackground: removeBg,
        bgTolerance,
        outlineEnhancement: outlineEnhance,
        contrastBoost,
      });

      const assetName = promptText ? promptText.split(' ')[0] : 'Sprite_Referencia';

      if (assetType === 'character') {
        const character = synthesizeCharacterFromBase(pixelGrid, assetName, gridSize, currentStyle);
        onApplyCharacter(character);
      } else {
        const tileset = synthesizeTilesetFromBase(pixelGrid, assetName, gridSize, currentStyle);
        onApplyTileset(tileset);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error procesando la imagen de referencia.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Gemini AI Analysis & Generation
  const handleAiGenerate = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        prompt: promptText || 'Personaje de rol top-down con proporciones retro para RPG',
        type: assetType,
        renderStyle: currentStyle,
        gridSize,
        referenceImageBase64: imageSrc || null,
        frameType: assetType === 'character' ? 'walk_cycle' : 'autotile_3x3',
      };

      const res = await fetch('/api/gemini/generate-pixel-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'No se pudo obtener respuesta del modelo Gemini.');
      }

      setAiReport(json.data);

      // If we have an image, run the algorithmic pixelation as well
      if (imageSrc) {
        await handleInstantPixelate();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error comunicándose con Gemini API.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-200 py-2">
      {/* Introduction Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Generador de Sprites &amp; Tilesets Asistido por Referencia
            </h2>
            <p className="text-xs text-slate-400">
              Sube cualquier ilustración, foto o boceto. La herramienta la convertirá en pixel art auténtico con proporciones top-down para Godot y Unity.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Upload & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Upload Area */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
              1. Imagen de Referencia
            </span>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer bg-slate-950/40 hover:bg-slate-950/80"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {imageSrc ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-36 h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center p-2 shadow-inner">
                    <img
                      src={imageSrc}
                      alt="Referencia subida"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <span className="text-xs text-amber-400 font-medium group-hover:underline">
                    Clic para cambiar imagen
                  </span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-800 rounded-full text-slate-400 group-hover:text-amber-400 transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-200">
                      Arrastra una imagen o haz clic para explorar
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, WebP (boceto, arte conceptual o sprite)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Presets Gallery */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-400 block mb-2">
                O elige una referencia rápida:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_REFERENCES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className="flex items-center gap-2 p-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{p.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-400 block mb-1.5">
                Descripción / Detalles para la IA (Opcional):
              </label>
              <input
                type="text"
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                placeholder="Ej. Caballero con armadura azul y espada brillante, estilo SNES..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Engine & Style Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              2. Parámetros de Renderizado
            </span>

            {/* Asset Type */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Tipo de Asset:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssetType('character')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    assetType === 'character'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Personaje 4-Dir</span>
                </button>
                <button
                  onClick={() => setAssetType('tileset')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    assetType === 'tileset'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tileset Autotile</span>
                </button>
              </div>
            </div>

            {/* Render Style */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Estilo de Gráficos RPG:
              </label>
              <select
                value={currentStyle}
                onChange={e => setCurrentStyle(e.target.value as RenderStyle)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-medium outline-none cursor-pointer"
              >
                <option value="16bit-snes">16-Bit SNES Classic (Chrono / Final Fantasy)</option>
                <option value="gba-pokemon">GBA Pokémon Emerald &amp; Golden Sun</option>
                <option value="endesga-32">Modern Indie HD (Sea of Stars / Celeste)</option>
                <option value="dark-gothic">Dark Gothic Roguelike (Grimdark)</option>
                <option value="cyberpunk-neon">Cyberpunk Neon RPG (Futurista)</option>
                <option value="pico-8">PICO-8 Mini Console (8-Bit Retro)</option>
                <option value="gameboy-dmg">Game Boy DMG (Monocromático Verde)</option>
              </select>
            </div>

            {/* Grid Size */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Resolución de Celda (Píxeles):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([16, 24, 32, 48] as GridSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      gridSize === size
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Pixel Settings */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Filtros de Píxeles
              </span>

              {/* Dithering */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tramado (Dithering):</span>
                <select
                  value={dithering}
                  onChange={e => setDithering(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
                >
                  <option value="none">Sin Tramado (Plano)</option>
                  <option value="bayer">Matriz Bayer 4x4 (Retro)</option>
                </select>
              </div>

              {/* Remove Background Toggle */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Quitar Fondo Automático:</span>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={e => setRemoveBg(e.target.checked)}
                  className="accent-amber-400 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Outline Enhancement */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Contorno Píxel 1px (Outline):</span>
                <input
                  type="checkbox"
                  checked={outlineEnhance}
                  onChange={e => setOutlineEnhance(e.target.checked)}
                  className="accent-amber-400 w-4 h-4 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={handleInstantPixelate}
                disabled={isProcessing || !imageSrc}
                className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isProcessing ? 'Procesando Píxeles...' : 'Pixelizar y Cargar en Editor'}</span>
              </button>

              <button
                onClick={handleAiGenerate}
                disabled={isProcessing}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Analizar con Gemini IA</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Blueprint Report Card (if generated) */}
      {aiReport && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Guía Técnica de Pixel Art Generada por Gemini
              </h3>
            </div>
            <span className="text-xs text-amber-300 font-mono">
              {aiReport.name || 'RPG Asset'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {aiReport.description || aiReport.designNotes}
          </p>

          {aiReport.palette && Array.isArray(aiReport.palette) && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Paleta Sugerida por la IA:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {aiReport.palette.map((c: string, i: number) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded border border-slate-700 shadow-sm flex items-center justify-center text-[9px] font-mono"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="font-semibold text-emerald-400 block mb-1">
                Consejo para Godot 4:
              </span>
              <p className="text-slate-400 leading-normal">
                {aiReport.godotTips || 'Configura texture_filter = 1 (Nearest) en AnimatedSprite2D para preservar la nitidez de los píxeles.'}
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="font-semibold text-cyan-400 block mb-1">
                Consejo para Unity:
              </span>
              <p className="text-slate-400 leading-normal">
                {aiReport.unityTips || 'Asegura Filter Mode: Point (No Filter) y Pixels Per Unit correspondiente en el Texture Importer.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
