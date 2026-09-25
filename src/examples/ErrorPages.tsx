/**
 * GOLDEN EXAMPLES: error pages.
 *
 *   404 (signed in)   inside the app's shell, so navigation stays and the person can go anywhere:
 *                     an EmptyState as the page's h1, and a link home.
 *   Error (any state) in AuthLayout, because the app, and so the shell, may be what failed to load:
 *                     what happened in plain words, Try again, and a way home.
 *
 * Neither page blames the person or shows a stack trace. No CSS file, no className, no style.
 */
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
