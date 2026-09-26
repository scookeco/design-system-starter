/**
 * How the example forms show draft ownership (src/app/model/drafts.ts), composed from system
 * components: the draft that came back, the question before leaving with unsaved changes, and the
 * warning when the record changes underneath an edit.
 */
import { Banner, Button, Dialog, useFormat } from '../index';
import type { NavigationGuard } from '../app/url/useUrlState';
import { updatedAgo } from './Freshness';

/** The form opened with a draft from storage: say so, and offer to throw it away. */
export function RestoredDraftBanner({ savedAt, onDiscard }: { savedAt: number; onDiscard: () => void }) {
  const format = useFormat();
  return (
    <Banner
      tone="info"
      title="Your unsaved changes are back"
      action={
        <Button variant="secondary" onClick={onDiscard}>
          Discard them
        </Button>
      }
    >
      {`They were kept on this device ${updatedAgo(format, savedAt)}. Nothing has been saved to the record yet.`}
    </Banner>
  );
}

/** Someone else saved the record while this draft was open: warn before the save does. */
export function ChangedWhileEditingBanner({ by, onReview }: { by: string | undefined; onReview: () => void }) {
  return (
    <Banner
      tone="warning"
      title="This record changed while you were editing"
      action={
        <Button variant="secondary" onClick={onReview}>
          Review changes
        </Button>
      }
    >
      {`${by ?? 'Someone else'} saved a newer version. Your changes are still here; review theirs before you save.`}
    </Banner>
  );
}

/** Asked when in-app navigation is held by unsaved changes. Opens while the guard has somewhere to go. */
export function UnsavedChangesDialog({ guard, onDiscard }: { guard: NavigationGuard; onDiscard: () => void }) {
  return (
    <Dialog
      size="sm"
      title="Leave with unsaved changes?"
      description="Your changes haven’t been saved to the record. If you leave, they’re kept as a draft on this device, so you can pick up where you left off."
      open={guard.pending !== undefined}
      onOpenChange={(open) => {
        if (!open) guard.stay();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={guard.stay}>
            Keep editing
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              onDiscard();
              guard.proceed();
            }}
          >
            Discard and leave
          </Button>
          <Button onClick={guard.proceed}>Leave, keep draft</Button>
        </>
      }
    />
  );
}
