import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

let sharedNetworkState = null;

const localNetworkSyncPlugin = () => ({
  name: 'local-network-sync-plugin',
  configureServer(server) {
    server.middlewares.use('/api/sync', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            sharedNetworkState = {
              ...parsed,
              serverTimestamp: Date.now()
            };
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, timestamp: sharedNetworkState.serverTimestamp }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
          }
        });
        return;
      }

      if (req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(sharedNetworkState || {}));
        return;
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), localNetworkSyncPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false
  }
})
