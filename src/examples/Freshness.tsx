/**
 * How the example pages show changes made elsewhere (src/app/model/live.ts). Shared by the list
 * and record pages, composed from system components only.
 *
 *   list     "3 new records · Show 3 new": new rows never push in under the cursor; the person
 *            chooses when the list moves. After an in-place update: "Updated just now by Priya".
 *   record   deleted elsewhere: the page says so instead of acting on a record that's gone.
 */
import { Button, Center, Cluster, EmptyState, Link, Text, useFormat, type Formatter } from '../index';
import { useLiveActivity, useShowNewRecords, type LiveActivity } from '../app/model/live';
import { usePersonName } from '../app/registries/refs';

/** "just now" inside a minute (the clock may not have moved at all), then the locale's relative time. */
export const updatedAgo = (format: Formatter, at: number, now = Date.now()) => (now - at < 60_000 ? 'just now' : format.relative(at, now));

/** Above a list's rows: what arrived since it was fetched. Renders nothing until something has. */
export function LiveListNotice() {
  const activity = useLiveActivity();
  // Nothing has arrived: render nothing, and subscribe to nothing more (the list's own render is untouched).
  if (activity.newIds.length === 0 && activity.lastAt === undefined) return null;
  return <LiveListNoticeContent activity={activity} />;
}

function LiveListNoticeContent({ activity }: { activity: LiveActivity }) {
  const format = useFormat();
  const showNew = useShowNewRecords();
  const by = usePersonName(activity.lastBy ?? '');
  const count = activity.newIds.length;

  if (count > 0) {
    return (
      <Cluster gap="sm" align="center">
        <Text role="status">{`${format.number(count)} new ${count === 1 ? 'record' : 'records'} since you opened this list`}</Text>
        <Button variant="secondary" size="sm" onClick={() => void showNew()}>
          {`Show ${format.number(count)} new`}
        </Button>
      </Cluster>
    );
  }
  if (activity.lastAt === undefined) return null;
  return (
    <Text size="caption" tone="muted" role="status">
      {`Updated ${updatedAgo(format, activity.lastAt)}${by ? ` by ${by}` : ''}`}
    </Text>
  );
}

/** A record page whose record someone else deleted while it was open. */
export function DeletedElsewhere() {
  const activity = useLiveActivity();
  const by = usePersonName(activity.lastBy ?? '');
  return (
    <Center max="lg" gutters="lg">
      <EmptyState
        reason="no-results"
        headingLevel={1}
        title="This record was deleted"
        description={`${by ?? 'Someone else'} deleted it while you had it open. Nothing you hadn’t saved was sent.`}
        action={<Link href="/records">Back to records</Link>}
      />
    </Center>
  );
}
