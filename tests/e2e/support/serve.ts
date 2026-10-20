import { extname, join, normalize, resolve, sep } from 'node:path';
import { FakeArgus, type DeviceFrame, type RouteSpec } from './fake-argus';

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

const control = async (url: URL, request: Request): Promise<Response> => {
  const device = url.searchParams.get('device') ?? '';
  switch (url.pathname) {
    case '/__e2e/routes':
      argus.define((await request.json()) as RouteSpec[]);
      return Response.json({ ok: true });
    case '/__e2e/context':
      argus.patchContext((await request.json()) as Record<string, unknown>);
      return Response.json({ ok: true });
    case '/__e2e/store':
      argus.store(url.searchParams.get('table') ?? '', (await request.json()) as Parameters<FakeArgus['store']>[1]);
      return Response.json({ ok: true });
    case '/__e2e/store-many':
      argus.storeMany(url.searchParams.get('table') ?? '', (await request.json()) as Parameters<FakeArgus['storeMany']>[1]);
      return Response.json({ ok: true });
    case '/__e2e/emit':
      argus.emit((await request.json()) as DeviceFrame[]);
      return Response.json({ ok: true });
    case '/__e2e/reset':
      argus.reset();
      return Response.json({ ok: true });
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
      return Response.json({ requests: argus.requests, bodies: argus.bodies });
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
    if (url.pathname.startsWith('/__e2e/')) return control(url, request);
    if (url.pathname.startsWith('/__api/')) {
      const path = `${url.pathname.slice('/__api'.length)}${url.search}`;
      return argus.api(request.method, path, await request.text(), request.headers.get('x-e2e-device') ?? '');
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
