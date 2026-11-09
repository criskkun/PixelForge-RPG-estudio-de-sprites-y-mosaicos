import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from './src/db/index.ts';
import { users, projects, libraryAssets, pixellabJobs, storageFiles } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { 
  PixelLabService, 
  hasPixelLabKey, 
  setServerPixelLabKey,
  setServerPixelLabBaseUrl,
  getPixelLabBaseUrl
} from './src/services/pixellab.ts';

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

  // Ensure persistent uploads folder exists
  const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasPixelLabKey: hasPixelLabKey(),
      pixelLabApiUrl: getPixelLabBaseUrl(),
      hasCloudSql: Boolean(process.env.SQL_HOST),
    });
  });

  // ----------------------------------------------------
  // AUTHENTICATION & USER PROFILE ENDPOINTS
  // ----------------------------------------------------

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, displayName } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Dirección de correo electrónico inválida.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'El usuario ya existe con este correo electrónico.' });
      }

      const uid = 'usr_' + Buffer.from(cleanEmail).toString('hex').slice(0, 16);
      const [newUser] = await db.insert(users).values({
        uid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        credits: 100,
      }).returning();

      res.json({
        success: true,
        user: newUser,
        message: 'Usuario registrado con éxito en Cloud SQL.',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err.message || 'Error al registrar usuario.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Dirección de correo electrónico inválida.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      let [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

      if (!user) {
        // Auto-provision on first login
        const uid = 'usr_' + Buffer.from(cleanEmail).toString('hex').slice(0, 16);
        const [newUser] = await db.insert(users).values({
          uid,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
          credits: 100,
        }).returning();
        user = newUser;
      }

      res.json({
        success: true,
        user,
        message: 'Sesión iniciada correctamente.',
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || 'Error al iniciar sesión.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      let [user] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

      if (!user) {
        user = {
          id: 0,
          uid,
          email: req.user?.email || 'guest@pixelart.studio',
          displayName: req.user?.name || 'Creador de Pixel Art',
          photoUrl: null,
          credits: 100,
          createdAt: new Date(),
        };
      }

      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // PIXELLAB API V2 ENDPOINTS (Proxied via Server)
  // ----------------------------------------------------

  // PixelLab Status & Balance
  app.get('/api/pixellab/status', async (_req, res) => {
    try {
      const configured = hasPixelLabKey();
      const apiUrl = getPixelLabBaseUrl();
      let balance = null;
      if (configured) {
        try {
          const balRes = await PixelLabService.getBalance();
          if (balRes && !balRes.raw) {
            balance = balRes;
          }
        } catch (e: any) {
          console.warn('Could not fetch PixelLab balance:', e.message);
        }
      }
      res.json({
        configured,
        apiUrl,
        balance,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Configure PixelLab API key & custom backend URL on server
  app.post('/api/pixellab/config', requireAuth, (req: AuthRequest, res) => {
    try {
      const { apiKey, apiUrl } = req.body;
      if (apiKey && typeof apiKey === 'string') {
        setServerPixelLabKey(apiKey.trim());
      }
      if (apiUrl && typeof apiUrl === 'string') {
        setServerPixelLabBaseUrl(apiUrl.trim());
      }
      res.json({ 
        success: true, 
        configured: hasPixelLabKey(), 
        apiUrl: getPixelLabBaseUrl() 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated endpoint: POST /create-image-pixen (Official PixelLab V2 endpoint)
  app.post('/api/pixellab/create-image-pixen', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const { prompt, width = 32, height = 32, transparent = true, image, negative_prompt, palette } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'El campo "prompt" es obligatorio.' });
      }

      const params: any = {
        prompt: prompt.trim(),
        width,
        height,
        transparent,
      };
      if (image) params.image = image;
      if (negative_prompt) params.negative_prompt = negative_prompt;
      if (palette) params.palette = palette;

      const result = await PixelLabService.createImagePixen(params);

      // Save job record to PostgreSQL
      const jobId = result?.job_id || result?.id || `pixen_${Date.now()}`;
      try {
        await db.insert(pixellabJobs).values({
          userId: uid,
          jobId: String(jobId),
          endpoint: 'create-image-pixen',
          prompt: prompt.trim(),
          status: result?.status || 'processing',
          resultData: JSON.stringify(result),
        });
      } catch (dbErr) {
        console.warn('Could not record job in database:', dbErr);
      }

      res.json({
        success: true,
        jobId: String(jobId),
        result,
      });
    } catch (err: any) {
      console.error('Error in create-image-pixen:', err);
      res.status(500).json({ error: err.message || 'Error al comunicarse con PixelLab create-image-pixen' });
    }
  });

  // Dedicated endpoint: POST /create-character (RPG Characters 4-dir / 8-dir / V3)
  app.post('/api/pixellab/create-character', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const { prompt, directions = 4, width = 32, height = 32, style = '16bit' } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'El campo "prompt" para el personaje es obligatorio.' });
      }

      const params: any = {
        prompt: prompt.trim(),
        width,
        height,
        transparent: true,
        directions,
        style,
      };

      let result: any;
      const endpointName = directions === 8 ? 'create-character-with-8-directions' : 'create-character-with-4-directions';
      if (directions === 8) {
        result = await PixelLabService.createCharacterWith8Directions(params);
      } else {
        result = await PixelLabService.createCharacterWith4Directions(params);
      }

      const jobId = result?.job_id || result?.id || `char_${Date.now()}`;
      try {
        await db.insert(pixellabJobs).values({
          userId: uid,
          jobId: String(jobId),
          endpoint: endpointName,
          prompt: prompt.trim(),
          status: result?.status || 'processing',
          resultData: JSON.stringify(result),
        });
      } catch (dbErr) {
        console.warn('Could not record job in database:', dbErr);
      }

      res.json({
        success: true,
        jobId: String(jobId),
        endpoint: endpointName,
        result,
      });
    } catch (err: any) {
      console.error('Error in create-character:', err);
      res.status(500).json({ error: err.message || 'Error al crear personaje en PixelLab' });
    }
  });

  // General PixelLab Dispatch / Generation Route (All official endpoints)
  app.post('/api/pixellab/generate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { operation, params } = req.body;
      const uid = req.user?.uid || 'guest_user_default';

      if (!operation) {
        return res.status(400).json({ error: 'Operación no especificada.' });
      }

      let result: any;
      switch (operation) {
        // Images
        case 'create-image-pixen':
          result = await PixelLabService.createImagePixen(params);
          break;
        case 'generate-image-v2':
          result = await PixelLabService.generateImageV2(params);
          break;
        case 'generate-with-style-v2':
          result = await PixelLabService.generateWithStyleV2(params);
          break;
        case 'image-to-pixelart':
          result = await PixelLabService.imageToPixelart(params);
          break;
        case 'image-to-pixelart-pro':
          result = await PixelLabService.imageToPixelartPro(params);
          break;

        // Characters
        case 'create-character-v3':
          result = await PixelLabService.createCharacterV3(params);
          break;
        case 'create-character-pro':
          result = await PixelLabService.createCharacterPro(params);
          break;
        case 'create-character-with-4-directions':
          result = await PixelLabService.createCharacterWith4Directions(params);
          break;
        case 'create-character-with-8-directions':
          result = await PixelLabService.createCharacterWith8Directions(params);
          break;
        case 'create-character-state':
          result = await PixelLabService.createCharacterState(params);
          break;
        case 'characters/animations':
          result = await PixelLabService.createCharacterAnimation(params);
          break;
        case 'animate-character':
          result = await PixelLabService.animateCharacter(params);
          break;

        // Objects
        case 'create-1-direction-object':
          result = await PixelLabService.create1DirectionObject(params);
          break;
        case 'create-8-direction-object':
          result = await PixelLabService.create8DirectionObject(params);
          break;
        case 'objects/animations':
          result = await PixelLabService.animateObject(params.objectId, params);
          break;
        case 'objects/states':
          result = await PixelLabService.createObjectState(params.objectId, params);
          break;

        // Animation & Rotation
        case 'animate-with-text-v3':
          result = await PixelLabService.animateWithTextV3(params);
          break;
        case 'animate-with-skeleton-v3':
          result = await PixelLabService.animateWithSkeletonV3(params);
          break;
        case 'interpolation-v2':
          result = await PixelLabService.interpolateV2(params);
          break;
        case 'edit-animation-v2':
          result = await PixelLabService.editAnimationV2(params);
          break;
        case 'generate-8-rotations-v3':
          result = await PixelLabService.generate8RotationsV3(params);
          break;
        case 'rotate':
          result = await PixelLabService.rotate(params);
          break;

        // Editing
        case 'edit-images-v2':
          result = await PixelLabService.editImagesV2(params);
          break;
        case 'edit-image-pixen':
          result = await PixelLabService.editImagePixen(params);
          break;
        case 'inpaint-v3':
          result = await PixelLabService.inpaintV3(params);
          break;

        // Maps & Tiles
        case 'create-tileset':
          result = await PixelLabService.createTileset(params);
          break;
        case 'create-tileset-sidescroller':
          result = await PixelLabService.createTilesetSidescroller(params);
          break;
        case 'create-isometric-tile':
          result = await PixelLabService.createIsometricTile(params);
          break;
        case 'map-objects':
          result = await PixelLabService.createMapObject(params);
          break;

        default:
          return res.status(400).json({ error: `Operación no soportada: ${operation}` });
      }

      // Log background job if job id returned
      const jobId = result?.job_id || result?.id || `${operation}_${Date.now()}`;
      try {
        await db.insert(pixellabJobs).values({
          userId: uid,
          jobId: String(jobId),
          endpoint: operation,
          prompt: params?.prompt || '',
          status: result?.status || 'processing',
          resultData: JSON.stringify(result),
        });
      } catch (dbErr) {
        console.warn('Could not record job in database:', dbErr);
      }

      res.json({ success: true, result, jobId: String(jobId) });
    } catch (err: any) {
      console.error('PixelLab generate error:', err);
      res.status(500).json({ error: err.message || 'Error en solicitud de PixelLab' });
    }
  });

  // Query background job status
  app.get('/api/pixellab/job/:jobId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;
      const status = await PixelLabService.getJobStatus(jobId);

      // Update in DB if completed or failed
      const normalizedStatus = (status?.status || status?.state || '').toLowerCase();
      if (normalizedStatus === 'completed' || normalizedStatus === 'failed') {
        try {
          await db.update(pixellabJobs)
            .set({
              status: normalizedStatus,
              resultData: JSON.stringify(status),
              updatedAt: new Date(),
            })
            .where(eq(pixellabJobs.jobId, jobId));
        } catch (e) {
          console.warn('DB update job error:', e);
        }
      }

      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Generation History from PostgreSQL
  app.get('/api/pixellab/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const history = await db.select()
        .from(pixellabJobs)
        .where(eq(pixellabJobs.userId, uid))
        .orderBy(desc(pixellabJobs.createdAt))
        .limit(50);
      res.json(history);
    } catch (err: any) {
      console.error('Fetch pixellab history error:', err);
      res.status(500).json({ error: 'Error al consultar historial de generaciones.' });
    }
  });

  // Retry generation job
  app.post('/api/pixellab/retry/:jobId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { jobId } = req.params;
      const uid = req.user?.uid || 'guest_user_default';

      const existing = await db.select().from(pixellabJobs).where(eq(pixellabJobs.jobId, jobId)).limit(1);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Trabajo no encontrado para reintentar.' });
      }

      const prevJob = existing[0];
      const operation = prevJob.endpoint;
      const prompt = prevJob.prompt || '';

      // Re-dispatch using PixelLabService
      let result: any;
      if (operation === 'create-image-pixen') {
        result = await PixelLabService.createImagePixen({ prompt, width: 32, height: 32, transparent: true });
      } else {
        result = await PixelLabService.generateImageV2({ prompt, width: 32, height: 32 });
      }

      const newJobId = result?.job_id || result?.id || `retry_${Date.now()}`;
      await db.insert(pixellabJobs).values({
        userId: uid,
        jobId: String(newJobId),
        endpoint: operation,
        prompt,
        status: result?.status || 'processing',
        resultData: JSON.stringify(result),
      });

      res.json({ success: true, newJobId: String(newJobId), result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al reintentar la generación.' });
    }
  });

  // ----------------------------------------------------
  // PROJECTS PERSISTENCE ENDPOINTS (PostgreSQL)
  // ----------------------------------------------------

  app.get('/api/projects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const userProjects = await db.select()
        .from(projects)
        .where(eq(projects.userId, uid))
        .orderBy(desc(projects.updatedAt));
      res.json(userProjects);
    } catch (err: any) {
      console.error('Fetch projects error:', err);
      res.status(500).json({ error: 'Error al consultar proyectos.' });
    }
  });

  app.post('/api/projects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const { id, name, description, width, height, palette, layers, animations, thumbnail, tags } = req.body;

      if (!name) return res.status(400).json({ error: 'El nombre del proyecto es obligatorio.' });

      if (id) {
        const updated = await db.update(projects)
          .set({
            name,
            description: description || '',
            width: width || 32,
            height: height || 32,
            palette: typeof palette === 'string' ? palette : JSON.stringify(palette || []),
            layers: typeof layers === 'string' ? layers : JSON.stringify(layers || []),
            animations: typeof animations === 'string' ? animations : JSON.stringify(animations || {}),
            thumbnail: thumbnail || '',
            tags: tags || '',
            updatedAt: new Date(),
          })
          .where(eq(projects.id, id))
          .returning();
        return res.json(updated[0]);
      } else {
        const inserted = await db.insert(projects)
          .values({
            userId: uid,
            name,
            description: description || '',
            width: width || 32,
            height: height || 32,
            palette: typeof palette === 'string' ? palette : JSON.stringify(palette || []),
            layers: typeof layers === 'string' ? layers : JSON.stringify(layers || []),
            animations: typeof animations === 'string' ? animations : JSON.stringify(animations || {}),
            thumbnail: thumbnail || '',
            tags: tags || '',
          })
          .returning();
        return res.json(inserted[0]);
      }
    } catch (err: any) {
      console.error('Save project error:', err);
      res.status(500).json({ error: 'Error al guardar el proyecto.' });
    }
  });

  app.get('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [proj] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!proj) return res.status(404).json({ error: 'Proyecto no encontrado.' });

      let parsedLayers = [];
      try {
        parsedLayers = typeof proj.layers === 'string' ? JSON.parse(proj.layers) : proj.layers;
      } catch {}

      let parsedPalette = [];
      try {
        parsedPalette = typeof proj.palette === 'string' ? JSON.parse(proj.palette) : proj.palette;
      } catch {}

      let parsedAnimations = {};
      try {
        parsedAnimations = typeof proj.animations === 'string' ? JSON.parse(proj.animations) : proj.animations;
      } catch {}

      res.json({
        ...proj,
        layers: parsedLayers,
        palette: parsedPalette,
        animations: parsedAnimations,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db.delete(projects).where(eq(projects.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // LIBRARY ASSETS ENDPOINTS (PostgreSQL)
  // ----------------------------------------------------

  app.get('/api/library', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const category = req.query.category as string | undefined;

      let assetsQuery = db.select().from(libraryAssets).where(eq(libraryAssets.userId, uid));
      const assets = await assetsQuery.orderBy(desc(libraryAssets.createdAt));

      if (category && category !== 'all') {
        const filtered = assets.filter(a => a.category === category);
        return res.json(filtered);
      }

      res.json(assets);
    } catch (err: any) {
      console.error('Fetch library error:', err);
      res.status(500).json({ error: 'Error al consultar biblioteca.' });
    }
  });

  app.post('/api/library', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const { name, category, dimensions, tags, data, thumbnail, source } = req.body;

      if (!name || !category || !data) {
        return res.status(400).json({ error: 'Nombre, categoría y datos son obligatorios.' });
      }

      const inserted = await db.insert(libraryAssets).values({
        userId: uid,
        name,
        category,
        dimensions: dimensions || '32x32',
        tags: tags || '',
        data: typeof data === 'string' ? data : JSON.stringify(data),
        thumbnail: thumbnail || '',
        source: source || 'custom',
      }).returning();

      res.json(inserted[0]);
    } catch (err: any) {
      console.error('Save to library error:', err);
      res.status(500).json({ error: 'Error al guardar en la biblioteca.' });
    }
  });

  app.delete('/api/library/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db.delete(libraryAssets).where(eq(libraryAssets.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // CLOUD STORAGE & FILE MANAGEMENT (S3 Compatible / PostgreSQL)
  // ----------------------------------------------------

  app.post('/api/storage/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const { fileBase64, filename = 'asset.png', mimeType = 'image/png', category = 'general' } = req.body;

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({ error: 'Contenido base64 del archivo requerido.' });
      }

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Generate unique safe filename
      const ext = path.extname(filename) || '.png';
      const safeBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueFilename = `${Date.now()}_${safeBase}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      await fs.promises.writeFile(filePath, buffer);

      const publicUrl = `/uploads/${uniqueFilename}`;

      const [record] = await db.insert(storageFiles).values({
        userId: uid,
        filename: uniqueFilename,
        originalName: filename,
        mimeType,
        size: buffer.length,
        url: publicUrl,
        category,
      }).returning();

      res.json({
        success: true,
        file: record,
        message: 'Archivo subido al almacenamiento cloud y registrado exitosamente.',
      });
    } catch (err: any) {
      console.error('Storage upload error:', err);
      res.status(500).json({ error: err.message || 'Error al subir archivo al almacenamiento cloud.' });
    }
  });

  app.get('/api/storage/files', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || 'guest_user_default';
      const files = await db.select()
        .from(storageFiles)
        .where(eq(storageFiles.userId, uid))
        .orderBy(desc(storageFiles.createdAt));
      res.json(files);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/storage/download/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const safeFilename = path.basename(filename);
      const filePath = path.join(uploadsDir, safeFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado en almacenamiento cloud.' });
      }

      res.download(filePath, safeFilename);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // GEMINI AI BLUEPRINT & PALETTES
  // ----------------------------------------------------

  app.post('/api/gemini/generate-pixel-blueprint', async (req, res) => {
    try {
      const {
        prompt,
        type = 'character',
        renderStyle = '16bit-snes',
        gridSize = 32,
        referenceImageBase64 = null,
        frameType = 'walk_cycle',
      } = req.body;

      const systemInstruction = `You are a master technical pixel artist and game engine asset designer specializing in 2D Top-Down RPGs (like Chrono Trigger, Zelda, Pokémon, and Sea of Stars).
Top-down RPG perspective rules:
- Top-down 3/4 angled view (head, shoulders, front of body, feet visible).
- Clean outlines with outline shading (darker tone of inner color or dark charcoal).
- Shading: 1 highlight tone, 1 base tone, 1-2 shadow tones per surface.
- Grid size: ${gridSize}x${gridSize} pixels.
- Style: ${renderStyle}.
- Type: ${type}.

Return a JSON object adhering to this schema:
{
  "name": string,
  "description": string,
  "palette": string[],
  "designNotes": string,
  "animationNotes": {
    "fps": number,
    "directions": ["down", "left", "right", "up"],
    "walkFramesCount": number,
    "keyFramesAdvice": string
  },
  "godotTips": string,
  "unityTips": string
}`;

      const contents: Array<any> = [];
      if (referenceImageBase64) {
        const cleanBase64 = referenceImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
        contents.push({
          text: `Analiza esta imagen de referencia y diseña un sprite/tileset de RPG top-down en píxeles basado en ella. Prompt adicional del usuario: "${prompt || 'Convertir imagen de referencia en sprite top-down'}". Estilo: ${renderStyle}, Tipo: ${type}, Tamaño celda: ${gridSize}x${gridSize}.`,
        });
      } else {
        contents.push({
          text: `Diseña un asset de RPG top-down en píxeles. Prompt del usuario: "${prompt}". Estilo: ${renderStyle}, Tipo: ${type}, Tamaño celda: ${gridSize}x${gridSize}, Animación: ${frameType}.`,
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
    console.log(`Pixel Art Studio running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
