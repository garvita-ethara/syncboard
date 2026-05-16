import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/http.js';
import { getJwtSecret } from '../lib/auth.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Authentication required');
    }

    const payload = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }
    if (!user.isActive) {
      throw new ApiError(403, 'This account is disabled');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function requireAdmin(req, _res, next) {
  return next(new ApiError(403, 'Global admin access is not enabled in this project'));
}
