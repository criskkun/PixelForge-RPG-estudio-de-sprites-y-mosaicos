import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileCode, 
  Copy, 
  Check, 
  Layers, 
  FolderArchive,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { CharacterSheet, TilesetSheet } from '../types';
import { 
  generateCharacterSpritesheet, 
  generateTilesetSpritesheet,
  generateGodotSpriteFrames,
  generateGodotScene,
  generateGodotGDScript,
  generateGodotTileSet,
  generateUnityMeta,
  generateUnityScript,
  generateAsepriteJSON,
  downloadZipBundle,
  triggerDownload
} from '../utils/engineExporters';

interface EngineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterSheet;
  tileset: TilesetSheet;
}

export const EngineExportModal: React.FC<EngineExportModalProps> = ({
  isOpen,
  onClose,
  character,
  tileset,
}) => {
  const [activeEngine, setActiveEngine] = useState<'godot4' | 'unity' | 'aseprite'>('godot4');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'character' | 'tileset'>('character');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const charSpritesheetData = generateCharacterSpritesheet(character);
  const tilesetSpritesheetData = generateTilesetSpritesheet(tileset);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const assetData = exportType === 'character' ? character : tileset;
      await downloadZipBundle(activeEngine === 'godot4' ? 'godot4' : 'unity', exportType, assetData);
    } catch (err) {
      console.error('Error generating ZIP export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPng = () => {
    const canvas = exportType === 'character' ? charSpritesheetData.canvas : tilesetSpritesheetData.canvas;
    canvas.toBlob(blob => {
      if (blob) {
        const name = exportType === 'character' ? `${character.name}_spritesheet.png` : `${tileset.name}_tileset.png`;
        triggerDownload(blob, name);
      }
    });
  };

  const handleDownloadJson = () => {
    const data = exportType === 'character' ? charSpritesheetData : tilesetSpritesheetData;
    const jsonStr = generateAsepriteJSON(data.slices, data.canvas.width, data.canvas.height);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const name = exportType === 'character' ? `${character.name}_aseprite.json` : `${tileset.name}_aseprite.json`;
    triggerDownload(blob, name);
  };

  // Preview code generators
  const godotSpriteFramesCode = generateGodotSpriteFrames(character, charSpritesheetData.slices);
  const godotGDScriptCode = generateGodotGDScript();
  const unityMetaCode = generateUnityMeta('a1b2c3d4e5f60718293a4b5c6d7e8f90', charSpritesheetData.slices, character.gridSize, charSpritesheetData.canvas.width, charSpritesheetData.canvas.height);
  const unityScriptCode = generateUnityScript();
  const asepriteJsonCode = generateAsepriteJSON(charSpritesheetData.slices, charSpritesheetData.canvas.width, charSpritesheetData.canvas.height);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Exportación Directa a Motores de Videojuegos
              </h2>
              <p className="text-xs text-slate-400">
                Paquetes listos para importar con metadatos, collision shapes, slicing y scripts de movimiento.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Tabs & Asset Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900">
          {/* Target Engine */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Motor:
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveEngine('godot4')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeEngine === 'godot4'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4.x (.tres / .tscn)
              </button>
              <button
                onClick={() => setActiveEngine('unity')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeEngine === 'unity'
                    ? 'bg-slate-200 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unity 2D (.meta / C#)
              </button>
              <button
                onClick={() => setActiveEngine('aseprite')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeEngine === 'aseprite'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Aseprite / JSON Estándar
              </button>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Exportar:
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setExportType('character')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  exportType === 'character'
                    ? 'bg-slate-800 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Personaje ({character.name})
              </button>
              <button
                onClick={() => setExportType('tileset')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  exportType === 'tileset'
                    ? 'bg-slate-800 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tileset ({tileset.name})
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Download Actions & Code Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Direct Download Callout Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-amber-400" />
                <span>
                  {activeEngine === 'godot4' && 'Paquete Completo para Godot 4.x'}
                  {activeEngine === 'unity' && 'Paquete Completo para Unity 2D'}
                  {activeEngine === 'aseprite' && 'Spritesheet PNG + Aseprite JSON'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeEngine === 'godot4' && 'Incluye spritesheet.png, sprite_frames.tres, character.tscn y player_controller.gd.'}
                {activeEngine === 'unity' && 'Incluye spritesheet.png, spritesheet.png.meta con cortes, TopDownPlayerController.cs y JSON.'}
                {activeEngine === 'aseprite' && 'Textura PNG optimizada para píxeles perfectos + metadatos JSON.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPng}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Solo PNG
              </button>

              <button
                onClick={handleDownloadJson}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Solo JSON
              </button>

              <button
                onClick={handleDownloadZip}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Comprimiendo...' : 'Descargar ZIP Proyecto'}</span>
              </button>
            </div>
          </div>

          {/* Spritesheet Visual Preview */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Vista Previa de la Textura (Spritesheet)
            </span>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center checker-pattern overflow-auto max-h-48">
              <img
                src={(exportType === 'character' ? charSpritesheetData.canvas : tilesetSpritesheetData.canvas).toDataURL()}
                alt="Spritesheet preview"
                className="pixelated border border-slate-700 rounded shadow-md max-h-40"
              />
            </div>
          </div>

          {/* Code Inspection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Código &amp; Recursos Generados
              </span>
              <button
                onClick={() => {
                  const content = 
                    activeEngine === 'godot4' ? godotSpriteFramesCode :
                    activeEngine === 'unity' ? unityMetaCode : asepriteJsonCode;
                  handleCopy(content, 'active_code');
                }}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                {copiedKey === 'active_code' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar al portapapeles</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed selection:bg-amber-500/30">
              <code>
                {activeEngine === 'godot4' && godotSpriteFramesCode}
                {activeEngine === 'unity' && unityMetaCode}
                {activeEngine === 'aseprite' && asepriteJsonCode}
              </code>
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
