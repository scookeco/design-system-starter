/**
 * Writes. One named mutation per domain verb; components call these and never touch the cache.
 * Each documents what it patches and what it invalidates.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postRecord, type NewRecord } from '../api/records';
import { useTenant } from '../tenant';
import { recordKeys } from './keys';

/**
 * createRecord: pessimistic. Carries an idempotency key, so a retry or a double submit makes one
 * record. On success: seeds the new record's detail entry, invalidates every list and count.
 */
export function useCreateRecord() {
  const tenant = useTenant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'createRecord'],
    mutationFn: ({ record, idempotencyKey }: { record: NewRecord; idempotencyKey: string }) => postRecord(tenant, record, idempotencyKey),
    onSuccess: (created) => {
      client.setQueryData(recordKeys.detail(tenant, created.id), created);
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(tenant) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(tenant) }),
      ]);
    },
  });
}
