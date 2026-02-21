import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import http from 'http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  // Use express.static middleware to avoid path-to-regexp parsing issues with wildcard patterns.
  server.use(express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*any', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        try {
          // Derive a sensible PartyKit URL for the rendered page so the client can
          // immediately connect after hydration. Use wss for https, ws for http.
          const proto = protocol === 'https' ? 'wss' : 'ws';
          const host = headers.host || req.headers.host || 'localhost';
          const wsUrl = `${proto}://${host}/parties/main/:roomId`;
          const injection = `<script>window.__WS_URL__ = ${JSON.stringify(wsUrl)};</script>`;
          // Inject before </head> so it's available during client bootstrap
          const injectedHtml = html.replace('</head>', `${injection}</head>`);
          return res.send(injectedHtml);
        } catch (e) {
          return res.send(html);
        }
      })
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const expressApp = app();
  const server = http.createServer(expressApp);
  // attach websocket server
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { attachWebsocketServer } = require('./src/server/ws-server');
    if (attachWebsocketServer) {
      attachWebsocketServer(server);
      console.log('WebSocket server attached on /api/ws');
    }
  } catch (e) {
    console.warn('WebSocket server not attached', e);
  }

  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
