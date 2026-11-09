/**
 * Centralized API Service for Pixel Art Studio
 * Connects frontend modules with the backend V2 API, Cloud SQL, Storage, and PixelLab V2.
 */

import { auth, googleAuthProvider, signInWithPopup, signOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { PixelGrid, ProjectData, GridSize } from '../types';
import { pixelateImage } from '../utils/pixelator';
import { RPG_PALETTES } from '../utils/palettes';

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  credits: number;
  createdAt: string;
}

export interface CloudStorageFile {
  id: number;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  createdAt: string;
}

export interface PixelLabJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | string;
  job_id?: string;
  result?: any;
  error?: string;
  progress?: number;
}

/**
 * Helper to get active Auth token header
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    }
  } catch (e) {
    console.warn('Could not retrieve user ID token, proceeding as guest:', e);
  }

  return headers;
}

export const pixelArtApi = {
  // ----------------------------------------------------
  // 1. HEALTH & BACKEND CONFIGURATION
  // ----------------------------------------------------
  async getHealth() {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Error ${res.status}: Servidor no disponible.`);
    return res.json();
  },

  async configureBackend(params: { apiKey?: string; apiUrl?: string }) {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/pixellab/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Error configurando el backend');
    return data;
  },

  // ----------------------------------------------------
  // 2. AUTHENTICATION & USER PROFILE
  // ----------------------------------------------------
  auth: {
    async register(email: string, displayName?: string) {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al registrar usuario.');
      return data.user as AuthUserProfile;
    },

    async login(email: string) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al iniciar sesión.');
      return data.user as AuthUserProfile;
    },

    async loginWithGoogle() {
      const result = await signInWithPopup(auth, googleAuthProvider);
      return result.user;
    },

    async logout() {
      await signOut(auth);
    },

    async getProfile(): Promise<AuthUserProfile> {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al obtener perfil.');
      return data.user;
    },

    onAuthStateChanged(callback: (user: User | null) => void) {
      return onAuthStateChanged(auth, callback);
    },
  },

  // ----------------------------------------------------
  // 3. PROJECTS & EDITABLE DOCUMENTS
  // ----------------------------------------------------
  projects: {
    async list(): Promise<any[]> {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', { headers });
      if (!res.ok) throw new Error('Error al listar proyectos.');
      return res.json();
    },

    async get(id: number): Promise<ProjectData> {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/projects/${id}`, { headers });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al recuperar proyecto.');
      return data;
    },

    async saveDocument(projectData: Partial<ProjectData>): Promise<ProjectData> {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify(projectData),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar el documento.');
      return data;
    },

    async delete(id: number) {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al eliminar el proyecto.');
      return data;
    },
  },

  // ----------------------------------------------------
  // 4. CLOUD STORAGE (S3-Compatible / Persistent Storage)
  // ----------------------------------------------------
  storage: {
    async upload(params: {
      fileBase64: string;
      filename?: string;
      mimeType?: string;
      category?: string;
    }): Promise<CloudStorageFile> {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al subir archivo a cloud storage.');
      return data.file;
    },

    async listFiles(): Promise<CloudStorageFile[]> {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/storage/files', { headers });
      if (!res.ok) throw new Error('Error al listar archivos de almacenamiento cloud.');
      return res.json();
    },

    getDownloadUrl(filename: string): string {
      return `/api/storage/download/${encodeURIComponent(filename)}`;
    },

    async triggerDownload(url: string, filename: string) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  },

  // ----------------------------------------------------
  // 5. LIBRARY ASSETS
  // ----------------------------------------------------
  library: {
    async list(category?: string): Promise<any[]> {
      const headers = await getAuthHeaders();
      const url = category && category !== 'all' ? `/api/library?category=${encodeURIComponent(category)}` : '/api/library';
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Error al listar la biblioteca.');
      return res.json();
    },

    async save(asset: {
      name: string;
      category: string;
      dimensions?: string;
      tags?: string;
      data: any;
      thumbnail?: string;
      source?: string;
    }) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/library', {
        method: 'POST',
        headers,
        body: JSON.stringify(asset),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al guardar en la biblioteca.');
      return data;
    },

    async delete(id: number) {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/library/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al eliminar de la biblioteca.');
      return data;
    },
  },

  // ----------------------------------------------------
  // 6. PIXELLAB AI ENGINE V2
  // ----------------------------------------------------
  pixelLab: {
    async getStatus() {
      const res = await fetch('/api/pixellab/status');
      if (!res.ok) throw new Error('Error al consultar estado de PixelLab.');
      return res.json();
    },

    async createImagePixen(params: {
      prompt: string;
      width?: number;
      height?: number;
      negative_prompt?: string;
      image?: string;
      palette?: string[];
      transparent?: boolean;
    }) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/pixellab/create-image-pixen', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error en PixelLab create-image-pixen.');
      return data;
    },

    async createCharacter(params: {
      prompt: string;
      directions?: 4 | 8;
      width?: number;
      height?: number;
      style?: string;
    }) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/pixellab/create-character', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al crear personaje en PixelLab.');
      return data;
    },

    async generate(operation: string, params: any) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/pixellab/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ operation, params }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al generar en PixelLab.');
      return data;
    },

    async getJobStatus(jobId: string): Promise<PixelLabJobStatus> {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/pixellab/job/${encodeURIComponent(jobId)}`, { headers });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error consultando trabajo de PixelLab.');
      return data.status;
    },

    async pollJobUntilComplete(
      jobId: string,
      onProgress?: (status: any, attempt: number) => void,
      intervalMs: number = 2500,
      maxAttempts: number = 40
    ) {
      let attempts = 0;
      while (attempts < maxAttempts) {
        attempts++;
        const status = await pixelArtApi.pixelLab.getJobStatus(jobId);
        if (onProgress) onProgress(status, attempts);

        const normStatus = (status?.status || (status as any)?.state || '').toLowerCase();
        if (normStatus === 'completed' || normStatus === 'success') {
          return status;
        }
        if (normStatus === 'failed' || normStatus === 'error' || normStatus === 'failure') {
          throw new Error(status?.error || 'El trabajo en PixelLab finalizó con error.');
        }

        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error(`Tiempo de espera agotado después de ${maxAttempts} intentos.`);
    },

    async getHistory(): Promise<any[]> {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/pixellab/history', { headers });
      if (!res.ok) throw new Error('Error al consultar historial.');
      return res.json();
    },

    async retry(jobId: string) {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/pixellab/retry/${encodeURIComponent(jobId)}`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al reintentar trabajo.');
      return data;
    },
  },

  // ----------------------------------------------------
  // 7. IMPORTING & EXPORTING ENGINE UTILITIES
  // ----------------------------------------------------
  editor: {
    /**
     * Converts any image URL, Base64 data URL, or file into a PixelGrid ready for the canvas
     */
    async importImageToCanvas(
      imageUrlOrBase64: string,
      targetSize: GridSize = 32
    ): Promise<PixelGrid> {
      return pixelateImage(imageUrlOrBase64, {
        gridSize: targetSize,
        style: '16bit-snes',
        dithering: 'none',
        removeBackground: false,
        bgTolerance: 20,
        outlineEnhancement: true,
        contrastBoost: 10,
      });
    },

    /**
     * Generates a combined Spritesheet PNG Data URL from a sequence of frames
     */
    generateSpritesheetDataUrl(
      frames: PixelGrid[],
      frameWidth: number,
      frameHeight: number,
      columns: number = 4
    ): string {
      if (!frames || frames.length === 0) throw new Error('No hay fotogramas para exportar.');

      const totalFrames = frames.length;
      const cols = Math.min(columns, totalFrames);
      const rows = Math.ceil(totalFrames / cols);

      const canvas = document.createElement('canvas');
      canvas.width = cols * frameWidth;
      canvas.height = rows * frameHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear contexto 2D para el spritesheet.');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      frames.forEach((frame, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const offsetX = col * frameWidth;
        const offsetY = row * frameHeight;

        for (let r = 0; r < frame.length; r++) {
          for (let c = 0; c < frame[r].length; c++) {
            const color = frame[r][c];
            if (color && color !== 'transparent') {
              ctx.fillStyle = color;
              ctx.fillRect(offsetX + c, offsetY + r, 1, 1);
            }
          }
        }
      });

      return canvas.toDataURL('image/png');
    },
  },
};
