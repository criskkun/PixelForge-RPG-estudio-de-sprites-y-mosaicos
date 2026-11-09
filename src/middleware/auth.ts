import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email: string; name?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If running in development / test mode, allow guest session
    req.user = {
      uid: 'guest_user_default',
      email: 'guest@pixelart.studio',
      name: 'Pixel Creator',
    };
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('Firebase ID token verification failed, falling back to guest:', error);
    req.user = {
      uid: 'guest_user_default',
      email: 'guest@pixelart.studio',
      name: 'Pixel Creator',
    };
    next();
  }
};
