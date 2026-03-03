import type { Request, Response, NextFunction } from 'express';

/**
 * Custom application error class with HTTP status code support.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Map of HTTP status codes to German error messages.
 */
const germanErrorMessages: Record<number, string> = {
  400: 'Ungueltige Anfrage',
  401: 'Nicht autorisiert',
  403: 'Zugriff verweigert',
  404: 'Ressource nicht gefunden',
  409: 'Konflikt mit bestehendem Datensatz',
  422: 'Validierungsfehler',
  429: 'Zu viele Anfragen',
  500: 'Interner Serverfehler',
};

/**
 * Centralized error handling middleware.
 * Returns JSON responses with German error messages.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  // Log non-operational (unexpected) errors
  if (!isOperational) {
    console.error('[FEHLER] Unerwarteter Fehler:', err);
  }

  const germanMessage =
    germanErrorMessages[statusCode] || 'Unbekannter Fehler';

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || germanMessage,
      statusCode,
      germanMessage,
    },
  });
}
