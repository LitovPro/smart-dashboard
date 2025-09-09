import express from 'express';
import cors from 'cors';
import path from 'path';
import { resolveClientDist } from './util/paths';
import { createErrorHandler } from './errors';
import routes from './routes';

const app = express();
const PORT = process.env['PORT'] || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use(routes);

// Static file serving
const clientDistPath = resolveClientDist();
console.log('Client dist path:', clientDistPath);

// Serve static assets
app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
  maxAge: process.env['NODE_ENV'] === 'production' ? '1y' : 0,
  immutable: process.env['NODE_ENV'] === 'production'
}));

// Serve index.html
app.get('*', (_req, res) => {
  if (process.env['NODE_ENV'] === 'production') {
    res.setHeader('Cache-Control', 'no-cache');
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handling
app.use(createErrorHandler());

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env['NODE_ENV'] === 'production') {
    console.log(`Serving static files from: ${resolveClientDist()}`);
  }
});
