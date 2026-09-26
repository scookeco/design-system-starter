/**
 * Per-record writes. Every write to a record, and every pushed change to it, reaches the cache
 * through here.
 */
import type { QueryClient } from '@tanstack/react-query';
import type { RecordEntity } from '../api/schemas';
import { recordKeys, type Partition } from './keys';

/**
 * A newer confirmed version of a record arrived from outside this client's writes (a live event):
 * the cached detail takes it, unless the cache already holds that version or a newer one.
 */
export function confirmRecord(client: QueryClient, partition: Partition, record: RecordEntity) {
  const key = recordKeys.detail(partition, record.id);
  const cached = client.getQueryData<RecordEntity>(key);
  if (cached && cached.version < record.version) client.setQueryData(key, record);
}
