/**
 * PixelLab API V2 Client
 * Official Base URL: Configured via PIXEL_ART_API_URL (defaults to https://api.pixellab.ai/v2)
 * Authenticated via Authorization: Bearer PIXELLAB_API_KEY
 */

// In-memory server token override (configured by admin/user through settings endpoint)
let runtimeApiKey: string = process.env.PIXELLAB_API_KEY || '';
let runtimeBaseUrl: string = process.env.PIXEL_ART_API_URL || '';

export function getPixelLabBaseUrl(): string {
  const url = runtimeBaseUrl || process.env.PIXEL_ART_API_URL || 'https://api.pixellab.ai/v2';
  return url.replace(/\/+$/, '');
}

export function setServerPixelLabBaseUrl(url: string) {
  if (url && typeof url === 'string') {
    runtimeBaseUrl = url.trim().replace(/\/+$/, '');
  }
}

export function setServerPixelLabKey(key: string) {
  runtimeApiKey = key.trim();
}

export function getServerPixelLabKey(): string {
  return runtimeApiKey || process.env.PIXELLAB_API_KEY || '';
}

export function hasPixelLabKey(): boolean {
  return Boolean(getServerPixelLabKey());
}

export async function pixellabRequest(endpoint: string, method: string = 'GET', body?: any) {
  const token = getServerPixelLabKey();
  if (!token) {
    throw new Error('API Token de PixelLab (PIXELLAB_API_KEY) no configurado en el servidor. Configúralo en variables de entorno o en la pestaña Configuración.');
  }

  const baseUrl = getPixelLabBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || data?.error || (data?.raw?.trim().startsWith('<') 
      ? `PixelLab API retornó HTTP ${response.status} (${response.statusText}). Verifica el endpoint y token.`
      : `PixelLab API Error (${response.status}): ${responseText.slice(0, 300)}`);
    throw new Error(errorMsg);
  }

  if (data?.raw && data.raw.trim().startsWith('<')) {
    throw new Error(`PixelLab backend respondió con HTML en lugar de JSON. Verifica la URL del servicio (${baseUrl}).`);
  }

  return data;
}

export const PixelLabService = {
  // Check balance
  getBalance: async () => {
    return pixellabRequest('/balance', 'GET');
  },

  // Check job status
  getJobStatus: async (jobId: string) => {
    return pixellabRequest(`/background-jobs/${jobId}`, 'GET');
  },

  // Cancel job
  cancelJob: async (jobId: string) => {
    return pixellabRequest(`/background-jobs/${jobId}`, 'DELETE');
  },

  // Poll until job completes or fails
  pollJobUntilComplete: async (
    jobId: string, 
    intervalMs: number = 2000, 
    maxAttempts: number = 40,
    onProgress?: (status: any) => void
  ) => {
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      const job = await PixelLabService.getJobStatus(jobId);
      if (onProgress) onProgress(job);

      const status = (job?.status || job?.state || '').toLowerCase();
      if (status === 'completed' || status === 'success') {
        return job;
      }
      if (status === 'failed' || status === 'error' || status === 'failure') {
        throw new Error(job?.error || 'El trabajo de PixelLab finalizó con error.');
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('Tiempo de espera agotado mientras se procesaba la generación en PixelLab.');
  },

  // 1. IMAGES
  // Endpoint principal: POST /create-image-pixen
  createImagePixen: async (params: {
    prompt: string;
    width?: number;
    height?: number;
    negative_prompt?: string;
    image?: string;
    style_image?: string;
    palette?: string[];
    transparent?: boolean;
    seed?: number;
    [key: string]: any;
  }) => {
    return pixellabRequest('/create-image-pixen', 'POST', params);
  },

  generateImageV2: async (params: { prompt: string; width?: number; height?: number; [key: string]: any }) => {
    return pixellabRequest('/generate-image-v2', 'POST', params);
  },

  generateWithStyleV2: async (params: { prompt: string; style_image_url?: string; [key: string]: any }) => {
    return pixellabRequest('/generate-with-style-v2', 'POST', params);
  },

  imageToPixelart: async (params: { image: string; target_size?: number; [key: string]: any }) => {
    return pixellabRequest('/image-to-pixelart', 'POST', params);
  },

  imageToPixelartPro: async (params: { image: string; target_size?: number; [key: string]: any }) => {
    return pixellabRequest('/image-to-pixelart-pro', 'POST', params);
  },

  // 2. CHARACTERS
  createCharacterV3: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-character-v3', 'POST', params);
  },

  createCharacterPro: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-character-pro', 'POST', params);
  },

  createCharacterWith4Directions: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-character-with-4-directions', 'POST', params);
  },

  createCharacterWith8Directions: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-character-with-8-directions', 'POST', params);
  },

  createCharacterState: async (params: { character_id: string; state_name: string; [key: string]: any }) => {
    return pixellabRequest('/create-character-state', 'POST', params);
  },

  createCharacterAnimation: async (params: { character_id: string; animation_name: string; [key: string]: any }) => {
    return pixellabRequest('/characters/animations', 'POST', params);
  },

  animateCharacter: async (params: { character_id?: string; prompt?: string; [key: string]: any }) => {
    return pixellabRequest('/animate-character', 'POST', params);
  },

  // 3. OBJECTS
  create1DirectionObject: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-1-direction-object', 'POST', params);
  },

  create8DirectionObject: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-8-direction-object', 'POST', params);
  },

  animateObject: async (objectId: string, params: any) => {
    return pixellabRequest(`/objects/${objectId}/animations`, 'POST', params);
  },

  createObjectState: async (objectId: string, params: any) => {
    return pixellabRequest(`/objects/${objectId}/states`, 'POST', params);
  },

  // 4. ANIMATIONS & ROTATIONS
  animateWithTextV3: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/animate-with-text-v3', 'POST', params);
  },

  animateWithSkeletonV3: async (params: any) => {
    return pixellabRequest('/animate-with-skeleton-v3', 'POST', params);
  },

  interpolateV2: async (params: any) => {
    return pixellabRequest('/interpolation-v2', 'POST', params);
  },

  editAnimationV2: async (params: any) => {
    return pixellabRequest('/edit-animation-v2', 'POST', params);
  },

  generate8RotationsV3: async (params: { image: string; [key: string]: any }) => {
    return pixellabRequest('/generate-8-rotations-v3', 'POST', params);
  },

  rotate: async (params: any) => {
    return pixellabRequest('/rotate', 'POST', params);
  },

  // 5. EDITING & INPAINTING
  editImagesV2: async (params: any) => {
    return pixellabRequest('/edit-images-v2', 'POST', params);
  },

  editImagePixen: async (params: any) => {
    return pixellabRequest('/edit-image-pixen', 'POST', params);
  },

  inpaintV3: async (params: any) => {
    return pixellabRequest('/inpaint-v3', 'POST', params);
  },

  // 6. MAPS & TILESETS
  createTileset: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-tileset', 'POST', params);
  },

  createTilesetSidescroller: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-tileset-sidescroller', 'POST', params);
  },

  createIsometricTile: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/create-isometric-tile', 'POST', params);
  },

  createMapObject: async (params: { prompt: string; [key: string]: any }) => {
    return pixellabRequest('/map-objects', 'POST', params);
  },
};
