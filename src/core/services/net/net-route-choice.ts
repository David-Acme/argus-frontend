import { ARGUS_HOME_SERVICES, ARGUS_ROUTE_SERVICES } from '@/shared/constants';
import type { HomeService, NetRemoteProfile, NetRouteChoice, NetRouteProbe } from '@/core/types';

const HOME_ID = /^[0-9a-f]{32}$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const DOMAIN_MAX_LENGTH = 253;

export function isHomeId(value: string): boolean {
  return HOME_ID.test(value);
}

function isDomain(value: string): boolean {
  return value.length <= DOMAIN_MAX_LENGTH && DOMAIN.test(value);
}

export function usableRemote(remote: NetRemoteProfile | undefined): remote is NetRemoteProfile {
  return remote !== undefined && isHomeId(remote.homeId) && isDomain(remote.domain);
}

export function serviceOfSegment(segment: string): HomeService | null {
  return Object.hasOwn(ARGUS_ROUTE_SERVICES, segment) ? (ARGUS_ROUTE_SERVICES[segment] ?? null) : null;
}

export function deviceName(service: HomeService, remote: NetRemoteProfile): string {
  return `${service}--${remote.homeId}.${remote.domain}`;
}

export function relayAuthority(remote: NetRemoteProfile | undefined, segment: string): string | null {
  const service = serviceOfSegment(segment);
  if (!service || !usableRemote(remote)) return null;
  return deviceName(service, remote);
}

export function admittedRelayHost(host: string, remote: NetRemoteProfile | undefined): boolean {
  if (!usableRemote(remote)) return false;
  return ARGUS_HOME_SERVICES.some((service) => host === deviceName(service, remote));
}

export function isRelayHost(host: string, domain: string): boolean {
  const name = host.toLowerCase();
  const suffix = `.${domain.toLowerCase()}`;
  return name.length > suffix.length && name.endsWith(suffix);
}

export function chooseRoute(probe: NetRouteProbe): NetRouteChoice {
  if (probe.lan === 'reached') return { mode: 'lan', status: 'home' };
  if (probe.relay === 'reached') return { mode: 'relay', status: 'cloud' };
  return { mode: 'lan', status: 'unreachable' };
}
