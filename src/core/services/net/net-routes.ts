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

export const SERVER_IDENTITY_PATH = '/pairing/status';

export function relocatedInstance(
  instance: NetPairedInstance,
  found: NetDiscovery
): NetPairedInstance | null {
  if (!found.ip || found.ip === instance.ip) return null;
  return { ...instance, ip: found.ip, routes: routePortsOf(found.routes) };
}
