import { Request } from 'express';
import { ClientId, QueryParams } from '../types';
import { HttpError } from '../errors';

export function requireClientId(req: Request): ClientId {
  const clientId = req.headers['x-client-id'] as string;
  if (!clientId || clientId.trim() === '') {
    throw new HttpError(400, 'Missing or empty x-client-id header');
  }
  return clientId.trim();
}

export function parsePagination(req: Request): QueryParams {
  const q = req.query['q'] as string | undefined;
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const limit = parseInt(req.query['limit'] as string || '20', 10);

  // Clean and limit search query
  let cleanQ: string | undefined = q?.trim() || undefined;
  if (cleanQ && cleanQ.length > 24) {
    cleanQ = cleanQ.slice(0, 24);
  }

  // Clamp pagination parameters
  const cleanOffset = Math.max(0, offset);
  const cleanLimit = Math.min(Math.max(1, limit), 100);

  return {
    q: cleanQ,
    offset: cleanOffset,
    limit: cleanLimit
  } as QueryParams;
}
