import { ARGUS_DEFAULT_ROUTE_PORTS } from '@/shared/constants';
import type { NetDiscovery, NetPairedInstance, NetRoute, NetRoutePorts } from '@/core/types';

export function routeSegment(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  const end = trimmed.search(/[/?#]/);
  return end === -1 ? trimmed : trimmed.slice(0, end);
}

export function routePortsOf(routes: readonly NetRoute[]): NetRoutePorts {
  const ports: NetRoutePorts = {};
  for (const route of routes) {
    const segment = routeSegment(route.path);
    if (segment) ports[segment] = route.port;
  }
  return ports;
}

export function portFor(instance: NetPairedInstance, path: string): number {
  const segment = routeSegment(path);
  return instance.routes[segment] ?? ARGUS_DEFAULT_ROUTE_PORTS[segment] ?? instance.port;
}

export function serviceUrl(instance: NetPairedInstance, path: string, scheme: 'https' | 'wss' = 'https'): string {
  return `${scheme}://${instance.host}:${portFor(instance, path)}${path}`;
}

export function urlPath(url: string): string {
  const authorityStart = url.indexOf('://');
  const rest = authorityStart < 0 ? url : url.slice(authorityStart + 3);
  const pathStart = rest.indexOf('/');
  return pathStart < 0 ? '/' : rest.slice(pathStart);
}

export function urlWithPort(url: string, port: number): string {
  const authorityStart = url.indexOf('://');
  if (authorityStart < 0) return url;
  const rest = url.slice(authorityStart + 3);
  const pathStart = rest.indexOf('/');
  const authority = pathStart < 0 ? rest : rest.slice(0, pathStart);
  const path = pathStart < 0 ? '/' : rest.slice(pathStart);
  return `${url.slice(0, authorityStart + 3)}${authority.replace(/:\d+$/, '')}:${port}${path}`;
}

export function urlAt(url: string, instance: NetPairedInstance): string {
  const segment = routeSegment(urlPath(url));
  const port = instance.routes[segment] ?? ARGUS_DEFAULT_ROUTE_PORTS[segment];
  return port ? urlWithPort(url, port) : url;
}

export const REDISCOVERY_MEMO_MS = 10000;

export function mayRediscover(lastFailureAt: number, now: number): boolean {
  return lastFailureAt === 0 || now - lastFailureAt >= REDISCOVERY_MEMO_MS;
}

export const SERVER_IDENTITY_PATH = '/pairing/status';

const routesDiffer = (stored: NetRoutePorts, announced: NetRoutePorts): boolean =>
  Object.entries(announced).some(([segment, port]) => stored[segment] !== port);

export function relocatedInstance(
  instance: NetPairedInstance,
  found: NetDiscovery
): NetPairedInstance | null {
  if (!found.ip) return null;
  const announced = routePortsOf(found.routes);
  const routes = { ...instance.routes, ...announced };
  if (found.ip !== instance.ip) return { ...instance, ip: found.ip, routes };
  if (Object.keys(announced).length === 0 || !routesDiffer(instance.routes, announced)) return null;
  return { ...instance, routes };
}
