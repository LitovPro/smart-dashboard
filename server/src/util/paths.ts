import path from 'path';

export function resolveClientDist(): string {
  return path.resolve(process.cwd(), 'client', 'dist');
}

