import jwt from 'jsonwebtoken';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return secret || 'development-only-secret-change-me';
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}
