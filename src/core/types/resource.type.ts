import type { RESOURCE_DOMAINS, RESOURCE_SCOPES } from '@/shared/constants';

export type ResourceDomain = (typeof RESOURCE_DOMAINS)[number];
export type ResourceScope = (typeof RESOURCE_SCOPES)[number];

export type ResourceMatch = {
  domain: ResourceDomain;
  scope?: ResourceScope;
  id?: number;
};

export type ResourceNotice = {
  domain: ResourceDomain;
  scope: ResourceScope;
  ids: readonly number[];
};
