import { NOTIFICATIONS_PANEL, PANEL_PARAM } from '@/shared/constants';

type PanelParams = Readonly<Record<string, string | string[] | undefined>>;

export type PanelRequest = {
  open: boolean;
  clear: boolean;
};

export function panelRequestOf(params: PanelParams, canRead: boolean): PanelRequest {
  const raw = params[PANEL_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return { open: canRead && value === NOTIFICATIONS_PANEL, clear: raw !== undefined };
}
