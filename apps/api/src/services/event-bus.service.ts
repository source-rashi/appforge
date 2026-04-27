import { EventEmitter } from 'events';

export type EventBusPayloads = {
  'row:created': { tableName: string; row: Record<string, unknown>; userId?: string };
  'row:updated': { tableName: string; row: Record<string, unknown>; userId?: string };
  'row:deleted': { tableName: string; id: string; userId?: string };
  'import:completed': { tableName: string; jobId: string; rowsImported: number };
  'import:failed': { tableName: string; jobId: string; error: string };
  'notification:new': { userId: string; notification: import('@prisma/client').Notification };
};

export class EventBusService extends EventEmitter {
  emit<K extends keyof EventBusPayloads>(event: K, payload: EventBusPayloads[K]): boolean {
    return super.emit(event, payload);
  }

  on<K extends keyof EventBusPayloads>(event: K, listener: (payload: EventBusPayloads[K]) => void): this {
    return super.on(event, listener);
  }

  off<K extends keyof EventBusPayloads>(event: K, listener: (payload: EventBusPayloads[K]) => void): this {
    return super.off(event, listener);
  }
}

export const eventBus = new EventBusService();
