import http from 'http';
import fs from 'fs';
import path from 'path';
import { request } from 'https';
import { apiMiddleware } from './server/api.ts';

// Simple .env file loader for local production testing
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  console.error('[Server] Failed to load .env file:', e);
}

const PORT = process.env.PORT || 3001;
const DIST_DIR = path.join(process.cwd(), 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
};

const server = http.createServer(async (req, res) => {
  const url = req.url || '';
  const method = req.method || 'GET';

  console.log(`[Request] ${method} ${url}`);

  // 1. Proxy Resend API requests
  if (url.startsWith('/api-resend')) {
    const targetPath = url.replace(/^\/api-resend/, '');
    const headers = { ...req.headers };
    
    // Override host header to match Resend API target
    headers['host'] = 'api.resend.com';
    
    // Remove headers that might interfere with proxying or trigger CORS errors locally
    delete headers['connection'];
    delete headers['sec-ch-ua'];
    delete headers['sec-ch-ua-mobile'];
    delete headers['sec-ch-ua-platform'];
    delete headers['origin'];
    delete headers['referer'];

    const proxyReq = request(
      {
        hostname: 'api.resend.com',
        port: 443,
        path: targetPath,
        method: method,
        headers: headers,
      },
      (proxyRes) => {
        // Forward the response status and headers
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    req.pipe(proxyReq);

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy connection failed', details: err.message }));
    });
    return;
  }

  // 2. Custom Backend APIs
  if (url.startsWith('/api')) {
    await apiMiddleware(req, res, () => {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API route not found' }));
    });
    return;
  }

  // 3. Static Files & SPA Fallback
  // Remove query params and hash from URL
  const sanitizedPath = url.split('?')[0].split('#')[0];
  let filePath = path.join(DIST_DIR, sanitizedPath);

  // If path is a directory (like root '/'), search for index.html
  if (sanitizedPath === '/' || sanitizedPath.endsWith('/')) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  // Check if file exists and is indeed a file
  let fileExists = false;
  try {
    const stat = fs.statSync(filePath);
    fileExists = stat.isFile();
  } catch (e) {
    fileExists = false;
  }

  if (fileExists) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback to index.html for Single Page Application client-side routing
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found. Please run "npm run build" first to generate frontend assets.');
    }
  }
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[Server] Production server is running at http://localhost:${PORT}`);
  console.log(`[Server] Serving static assets from: ${DIST_DIR}`);
});
