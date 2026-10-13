import { extname, join, normalize, resolve, sep } from 'node:path';
import { FakeArgus } from './fake-argus';

const DIST_ROOT = resolve(join(import.meta.dir, '..', '..', '..', 'dist'));

const portArgument = (): number => {
  const index = process.argv.indexOf('--port');
  const value = Number(index >= 0 ? process.argv[index + 1] : NaN);
  if (!Number.isInteger(value) || value <= 0) throw new Error('serve.ts needs --port <n>');
  return value;
};

const argus = new FakeArgus();

const bundleFile = async (pathname: string): Promise<Response> => {
  const path = normalize(decodeURIComponent(pathname));
  const target = extname(path) ? resolve(DIST_ROOT, `.${path}`) : join(DIST_ROOT, 'index.html');
  if (target !== DIST_ROOT && !target.startsWith(`${DIST_ROOT}${sep}`)) return new Response('Not found', { status: 404 });
  const file = Bun.file(target);
  if (!(await file.exists())) return new Response('Not found', { status: 404 });
  return new Response(file);
};

const control = (url: URL): Response => {
  const device = url.searchParams.get('device') ?? '';
  switch (url.pathname) {
    case '/__e2e/health':
      return Response.json({ ok: true });
    case '/__e2e/drop':
      return Response.json({ dropped: argus.drop(device) });
    case '/__e2e/refuse':
      argus.refuse(device, Number(url.searchParams.get('ms') ?? 0));
      return Response.json({ refused: device });
    case '/__e2e/connected':
      return Response.json({ connected: argus.connected(device) });
    case '/__e2e/rows':
      return Response.json({ rows: argus.rows(url.searchParams.get('table') ?? '') });
    case '/__e2e/requests':
      return Response.json({ requests: argus.requests });
    default:
      return new Response('Not found', { status: 404 });
  }
};

const server = Bun.serve<{ device: string }>({
  hostname: '127.0.0.1',
  port: portArgument(),
  async fetch(request, bun) {
    const url = new URL(request.url);
    if (url.pathname === '/__sync') {
      const device = url.searchParams.get('device') ?? '';
      if (!device || !argus.accepts(device)) return new Response('refused', { status: 503 });
      return bun.upgrade(request, { data: { device } }) ? undefined : new Response('upgrade failed', { status: 400 });
    }
    if (url.pathname.startsWith('/__e2e/')) return control(url);
    if (url.pathname.startsWith('/__api/')) {
      const path = `${url.pathname.slice('/__api'.length)}${url.search}`;
      return argus.api(request.method, path, await request.text());
    }
    return bundleFile(url.pathname);
  },
  websocket: {
    open: (socket) => argus.open(socket),
    message: (socket, message) => argus.receive(socket, typeof message === 'string' ? message : new TextDecoder().decode(message)),
    close: (socket) => argus.close(socket),
  },
});

console.log(`fake argus on http://127.0.0.1:${server.port}`);
