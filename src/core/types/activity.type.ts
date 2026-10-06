export type ActivityAction = 'create' | 'read' | 'update' | 'delete';

export type ActivityItem = {
  id: number;
  userId: number;
  recordId: number;
  table: string;
  module: string;
  action: string;
  oldData: unknown;
  newData: unknown;
  ipAddress: string;
  createdAt: number;
};

export type ActivityPeriod = 'today' | 'week' | 'month' | 'all' | 'custom';

export type ActivityFilter = {
  module: string | null;
  userId: number | null;
  action: ActivityAction | null;
  period: ActivityPeriod;
  from: number | null;
  to: number | null;
};
