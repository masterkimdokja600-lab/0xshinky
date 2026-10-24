const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const gameTrailer = require('./api/footage');
const gameCatalog = require('./api/catalog');

const root = path.resolve(__dirname, 'public');
const port = Number(process.env['0XSHINKY_PREVIEW_PORT'] || 4173);
const contentTypes = {
  '.apk': 'application/vnd.android.package-archive',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(body);
}

async function handleTrailer(req, res, url) {
  req.query = Object.fromEntries(url.searchParams.entries());
  const adapter = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(statusCode) {
      return {
        json(value) {
          sendJson(res, statusCode, value);
          return res;
        }
      };
    }
  };
  await gameTrailer(req, adapter);
}

async function handleCatalog(req, res) {
  const adapter = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(statusCode) {
      return {
        json(value) {
          sendJson(res, statusCode, value);
          return res;
        }
      };
    }
  };
  await gameCatalog(req, adapter);
}

async function handleStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (_) {
    res.writeHead(400).end('Bad request');
    return;
  }

  const filename = path.resolve(root, `.${pathname}`);
  if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let target = filename;
  try {
    const stat = await fs.promises.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
    const data = await fs.promises.readFile(target);
    res.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Length': data.length,
      'Content-Type': contentTypes[path.extname(target).toLowerCase()] || 'application/octet-stream'
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (_) {
    res.writeHead(404).end('Not found');
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  try {
    if (url.pathname === '/api/footage') {
      await handleTrailer(req, res, url);
      return;
    }
    if (url.pathname === '/api/catalog') {
      await handleCatalog(req, res);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }
    await handleStatic(req, res, url);
  } catch (_) {
    if (!res.headersSent) sendJson(res, 500, { error: 'Preview request failed.' });
    else res.end();
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`0xshinky preview: http://127.0.0.1:${port}\n`);
});
