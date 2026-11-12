import type { Plugin } from 'vite';

export function editorDemoSession(target: string, username: string, password: string, postId: number): Plugin {
  return { name: 'editor-demo-session', apply: 'serve', configureServer(server) {
    server.middlewares.use('/__demo/session', async (req, res, next) => {
      if (req.method !== 'POST' || req.url !== '/') { next(); return; }
      try {
        const response = await fetch(`${target}/api/v1/auth/login`, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(10000) });
        if (!response.ok) { res.statusCode = 503; res.end(); return; }
        const data = await response.json();
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ ...data, postId }));
      } catch { res.statusCode = 503; res.end(); }
    });
  } };
}
