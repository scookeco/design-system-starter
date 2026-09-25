import { Button, ToastProvider, useToast, Toast } from '../../src/index';
import type { UsageDoc } from './types';

function SaveButton() {
  const toast = useToast();
  return <Button onClick={() => toast({ title: 'Record saved', tone: 'success' })}>Save</Button>;
}

function FailingButton() {
  const toast = useToast();
  return (
    <Button onClick={() => toast({ title: 'Payment failed', description: 'Update your card to keep your plan.', tone: 'danger' })}>
      Renew plan
    </Button>
  );
}

export const usage: UsageDoc = {
  covers: [Toast, ToastProvider, useToast],
  whenToUse: [
    'Confirming the outcome of an action that doesn’t change the page visibly: saved, copied, export started.',
    'Call `useToast()` from inside the app; AppShell mounts the one `ToastProvider`.',
  ],
  whenNotToUse: [
    { situation: 'Something people must fix or act on', instead: '`Banner` in the page, or an inline field error' },
    { situation: 'A form’s validation errors', instead: 'field errors plus an error summary `Banner`' },
  ],
  do: {
    caption: 'A short confirmation that disappears by itself. Press the button to see it.',
    render: () => (
      <ToastProvider label="Notifications (do example)">
        <SaveButton />
      </ToastProvider>
    ),
  },
  dont: {
    caption: 'A failure that needs action, in a toast that auto-dismisses. Put it in a Banner where the problem is.',
    render: () => (
      <ToastProvider label="Notifications (don’t example)">
        <FailingButton />
      </ToastProvider>
    ),
  },
  accessibility: [
    'Toasts live in a labelled region; success, info and neutral are announced politely, danger and warning assertively.',
    'The tone has an icon, never colour alone. Anything the user must act on needs `duration={Infinity}`, and usually isn’t a toast.',
  ],
};
