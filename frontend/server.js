import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 5173;
const distDir = join(__dirname, 'dist');
const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

const server = createServer((req, res) => {
  const filePath = join(distDir, req.url);

  // Si pide un archivo con extensión (assets, etc)
  if (/\.\w+$/.test(req.url)) {
    try {
      const data = readFileSync(filePath);
      let contentType = 'text/plain';

      if (req.url.endsWith('.js')) contentType = 'application/javascript';
      else if (req.url.endsWith('.css')) contentType = 'text/css';
      else if (req.url.endsWith('.html')) contentType = 'text/html';
      else if (req.url.endsWith('.json')) contentType = 'application/json';
      else if (req.url.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (req.url.endsWith('.png')) contentType = 'image/png';
      else if (req.url.endsWith('.jpg')) contentType = 'image/jpeg';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  } else {
    // Todo lo demás es una ruta SPA → index.html
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(indexHtml);
  }
});

server.listen(PORT, () => {
  console.log(`✅ SPA Server corriendo en http://localhost:${PORT}`);
});
