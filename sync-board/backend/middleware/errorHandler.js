import { ZodError } from 'zod';
import { ApiError } from '../lib/http.js';

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Route not found'));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    const firstFieldError = Object.values(flattened.fieldErrors).flat().find(Boolean);
    const firstFormError = flattened.formErrors.find(Boolean);

    return res.status(400).json({
      message: firstFieldError || firstFormError || 'Validation failed',
      details: flattened
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details
    });
  }

  if (error?.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this unique value already exists' });
  }

  if (error?.code === 'P2025') {
    return res.status(404).json({ message: 'Requested record was not found' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error' });
}
