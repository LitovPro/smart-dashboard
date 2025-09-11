import path from 'path';

export function resolveClientDist(): string {
  // Production path: relative to server dist directory
  const dist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  console.log('Resolved client dist path:', dist);
  return dist;
}

