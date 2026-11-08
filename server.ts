import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // AI Sprite & Tileset Generation/Analysis endpoint
  app.post('/api/gemini/generate-pixel-blueprint', async (req, res) => {
    try {
      const {
        prompt,
        type = 'character', // 'character' | 'tileset' | 'prop'
        renderStyle = '16bit-snes', // '16bit-snes' | 'gba-pokemon' | 'modern-hd' | '8bit-nes' | 'dark-gothic' | 'cyberpunk'
        gridSize = 32,
        referenceImageBase64 = null,
        frameType = 'walk_cycle',
      } = req.body;

      const systemInstruction = `You are a master technical pixel artist and game engine asset designer specializing in 2D Top-Down RPGs (like Chrono Trigger, Zelda A Link to the Past, Pokémon Emerald, and Sea of Stars).
Your job is to generate precise pixel art color palettes, animation frame timing, Godot 4 & Unity metadata, and pixel layout guidelines.
Top-down RPG perspective rules:
- Top-down 3/4 angled view (head, shoulders, front of body, feet visible).
- Clean outlines with outline shading (darker tone of inner color or dark charcoal).
- Shading: 1 highlight tone, 1 base tone, 1-2 shadow tones per surface.
- Grid size: ${gridSize}x${gridSize} pixels.
- Style: ${renderStyle}.
- Type: ${type}.

Return a JSON object strictly adhering to this schema:
{
  "name": string (descriptive name),
  "description": string (character or tileset summary in Spanish),
  "palette": string[] (hex colors, 8 to 24 colors fitting the chosen aesthetic),
  "designNotes": string (shading, light source from top-left, key silhouette points),
  "animationNotes": {
    "fps": number,
    "directions": ["down", "left", "right", "up"],
    "walkFramesCount": number,
    "keyFramesAdvice": string
  },
  "godotTips": string,
  "unityTips": string,
  "pixelMatrixGuide": {
    "primaryRegions": [
      { "name": string, "colorHex": string, "rect": { "x": number, "y": number, "w": number, "h": number } }
    ]
  }
}`;

      const contents: Array<any> = [];

      if (referenceImageBase64) {
        // Strip data:image/*;base64, prefix if present
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
        contents.push({
          text: `Analiza esta imagen de referencia y diseña un sprite/tileset de RPG top-down en píxeles basado en ella. Prompt adicional del usuario: "${prompt || 'Convertir imagen de referencia en sprite top-down'}". Estilo deseado: ${renderStyle}, Tipo: ${type}, Tamaño celda: ${gridSize}x${gridSize}. Detalla la paleta extraída, proporciones de silueta, y guía de renderizado pixel art.`,
        });
      } else {
        contents.push({
          text: `Diseña un asset de RPG top-down en píxeles. Prompt del usuario: "${prompt}". Estilo: ${renderStyle}, Tipo: ${type}, Tamaño celda: ${gridSize}x${gridSize}, Animación: ${frameType}. Detalla paleta óptima para RPG, proporciones y consejos técnicos para Godot y Unity.`,
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = { rawText: responseText };
      }

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error('Error in /api/gemini/generate-pixel-blueprint:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Error processing request with Gemini API',
      });
    }
  });

  // Vite or Static files handling
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PixelForge Studio running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
