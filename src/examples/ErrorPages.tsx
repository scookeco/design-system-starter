/**
 * GOLDEN EXAMPLES: error pages.
 *
 *   404 (signed in)   inside the app's shell, so navigation stays and the person can go anywhere:
 *                     an EmptyState as the page's h1, and a link home.
 *   403 (signed in)   the same, for a page this person may not open: what they can't do and who can
 *                     change that. Never a silent redirect home.
 *   Error (any state) in AuthLayout, because the app, and so the shell, may be what failed to load:
 *                     what happened in plain words, Try again, and a way home.
 *   Render error      one page failed to render (RouteView's error boundary caught it): the same
 *                     error state, but inside the shell, which still works. Try again renders the
 *                     page afresh; the nav goes anywhere else.
 *   Load error        one page's code failed to load (a dropped connection, or a deploy replaced it):
 *                     the same place, saying so. Try again fetches the code again. If that fails too,
 *                     the next step is Reload the page (a deploy may have removed the old code), and
 *                     focus moves to it, because the Try again the person pressed is gone.
 *
 * Neither page blames the person or shows a stack trace. No CSS file, no className, no style.
 */
import { useEffect, useRef } from 'react';
import { AuthLayout, Button, Center, Cluster, EmptyState, Link } from '../index';
import { ExampleShell } from './ExampleShell';

export function NotFoundPage() {
  return (
    <ExampleShell current="">
      <Center max="lg" gutters="lg">
        <EmptyState
          reason="no-results"
          headingLevel={1}
          title="Page not found"
          description="The link may be out of date, or the page may have moved."
          action={<Link href="/home">Go to Home</Link>}
        />
      </Center>
    </ExampleShell>
  );
}

export interface ForbiddenPageProps {
  /** The primary nav item the page belongs under, so the shell still shows where they are. */
  current?: string;
  /** Why, in words they can act on (from DENIAL_REASONS). */
  reason?: string;
}

export function ForbiddenPage({ current = '', reason = 'Ask a workspace admin for access.' }: ForbiddenPageProps) {
  return (
    <ExampleShell current={current}>
      <Center max="lg" gutters="lg">
        <EmptyState reason="no-results" headingLevel={1} title="You don’t have access to this page" description={reason} action={<Link href="/home">Go to Home</Link>} />
      </Center>
    </ExampleShell>
  );
}

export interface ServerErrorPageProps {
  /** A reference support can look up. Shown, never explained. */
  reference?: string;
}

export function ServerErrorPage({ reference = 'ERR-7F3A-2C' }: ServerErrorPageProps) {
  return (
    <AuthLayout brand="Acme">
      <EmptyState
        reason="error"
        headingLevel={1}
        title="Something went wrong on our side"
        description={`Nothing you did caused this, and nothing was lost. If it keeps happening, contact support with reference ${reference}.`}
        action={
          <Cluster gap="md" justify="center">
            <Button onClick={() => window.location.reload()}>Try again</Button>
            <Link href="/home">Go to Home</Link>
          </Cluster>
        }
      />
    </AuthLayout>
  );
}

export interface RenderErrorPageProps {
  /** The primary nav item the page belongs under, so the shell still shows where they are. */
  current?: string;
  /** Render the page again (the boundary's retry, which fetches the page's code again after a load failure). */
  onRetry: () => void;
  /** What failed: the page's renderer (`render`, the default) or its code (`load`). */
  cause?: 'render' | 'load';
  /** A retry already failed. For a load failure the next step is a full reload. */
  repeated?: boolean;
  /** The full reload offered after a repeated load failure. Defaults to reloading the window. */
  onReload?: () => void;
}

const reloadWindow = () => window.location.reload();

/** A page that failed to render, or whose code failed to load, in its place inside the shell: RouteView's `renderError`. */
export function RenderErrorPage({ current = '', onRetry, cause = 'render', repeated = false, onReload = reloadWindow }: RenderErrorPageProps) {
  const reload = cause === 'load' && repeated;
  const reloadRef = useRef<HTMLButtonElement>(null);
  // The Try again the person pressed has gone: put focus on the step that replaced it.
  useEffect(() => {
    if (reload) reloadRef.current?.focus();
  }, [reload]);

  const copy =
    cause === 'render'
      ? {
          title: 'This page couldn’t be shown',
          description: 'Part of it failed to load on our side. Nothing you did caused this, and nothing was lost. Try again, or go somewhere else from the menu.',
        }
      : reload
        ? {
            title: 'This page still couldn’t load',
            description: 'The app may have been updated since you opened it. Reload the page to get the latest version. Nothing you did caused this.',
          }
        : {
            title: 'This page couldn’t load',
            description: 'Check your connection and try again. Nothing you did caused this, and nothing was lost.',
          };

  return (
    <ExampleShell current={current}>
      <Center max="lg" gutters="lg">
        <EmptyState
          reason="error"
          headingLevel={1}
          title={copy.title}
          description={copy.description}
          action={
            <Cluster gap="md" justify="center">
              {reload ? (
                <Button ref={reloadRef} onClick={onReload}>
                  Reload the page
                </Button>
              ) : (
                <Button onClick={onRetry}>Try again</Button>
              )}
              <Link href="/home">Go to Home</Link>
            </Cluster>
          }
        />
      </Center>
    </ExampleShell>
  );
}
