/**
 * Joins by id, rendered. A record holds its owner's and account's ids; these read the name from
 * the people and account caches at render time. So a rename happens in one cache entry and shows
 * everywhere (table rows, board cards, properties, headers) with nothing to patch or copy.
 */
import { Avatar, Cluster, Link, Text } from '../../index';
import { useAccountRef, usePerson } from '../model/queries';

/** Shown while the directory loads, or for an id it doesn't have (someone deleted, a stale link). */
const Pending = ({ children }: { children: string }) => (
  <Text as="span" tone="muted">
    {children}
  </Text>
);

/** A person's name, with an avatar unless `plain`. */
export function PersonRef({ id, plain = false }: { id: string; plain?: boolean }) {
  const person = usePerson(id);
  if (person.isPending) return <Pending>…</Pending>;
  if (!person.data) return <Pending>Unknown person</Pending>;
  if (plain) return <>{person.data.name}</>;
  return (
    <Cluster gap="xs" align="center" wrap={false}>
      <Avatar name={person.data.name} size="sm" decorative />
      {person.data.name}
    </Cluster>
  );
}

/** An account's name, linked to its page unless `plain`. A record with no account says so. */
export function AccountRef({ id, plain = false }: { id: string | null; plain?: boolean }) {
  const account = useAccountRef(id ?? '');
  if (id === null) return <Pending>No account</Pending>;
  if (account.isPending) return <Pending>…</Pending>;
  if (!account.data) return <Pending>Unknown account</Pending>;
  return plain ? <>{account.data.name}</> : <Link href={`/accounts/${account.data.id}`}>{account.data.name}</Link>;
}

/** A person's name as a string, for text that isn't markup (a header's description line). */
export const usePersonName = (id: string) => usePerson(id).data?.name;
