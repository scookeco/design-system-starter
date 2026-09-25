/**
 * GOLDEN EXAMPLE: the sign-in archetype (and the pattern for every signed-out page).
 *
 * Signed-out pages render in AuthLayout, never AppShell: a brand, one centred card, a footer.
 * No CSS file, no className, no style.
 *
 * Anatomy:
 *   card     h1 + one line · error Banner (when a sign-in failed) · the ways in, in order of preference:
 *            1. single sign-on (the primary action: one click for work accounts)
 *            2. an emailed sign-in link (no password to remember)
 *            3. a password, offered as a secondary route, not a peer
 *   steps    sign-in → link sent | password → verification code (MFA) → the app
 *   footer   privacy and terms links
 *
 * Errors: field errors on submit say what to fix; a failed sign-in is a danger Banner that never
 * says which of email or password was wrong. Nothing typed is cleared.
 */
import { useState, type FormEvent } from 'react';
import { AuthLayout, Banner, Button, Cluster, Heading, Link, Stack, Text, TextField } from '../index';

export type SignInStep = 'start' | 'password' | 'link-sent' | 'verify';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignInPageProps {
  initialStep?: SignInStep;
  initialEmail?: string;
  /** Render as if the last sign-in attempt failed (gallery and tests). */
  initialError?: string;
}

export function SignInPage({ initialStep = 'start', initialEmail = '', initialError }: SignInPageProps) {
  const [step, setStep] = useState<SignInStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; code?: string }>({});

  const go = (next: SignInStep) => {
    setStep(next);
    setError(undefined);
    setFieldErrors({});
  };

  const emailError = () => (EMAIL.test(email.trim()) ? undefined : 'Enter your work email, like sam@example.com.');

  const sendLink = (event: FormEvent) => {
    event.preventDefault();
    const problem = emailError();
    setFieldErrors({ email: problem });
    if (!problem) go('link-sent');
  };

  const signInWithPassword = (event: FormEvent) => {
    event.preventDefault();
    const problems = { email: emailError(), password: password === '' ? 'Enter your password.' : undefined };
    setFieldErrors(problems);
    if (problems.email || problems.password) return;
    // Stands in for the sign-in request; this account has two-step verification on.
    go('verify');
  };

  const verify = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({ code: /^\d{6}$/.test(code.trim()) ? undefined : 'Enter the 6-digit code from your authenticator app.' });
  };

  return (
    <AuthLayout
      brand="Acme"
      footer={
        <Cluster gap="md" justify="center">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </Cluster>
      }
    >
      {step === 'verify' ? (
        <>
          <Stack gap="2xs">
            <Heading level={1} size={2}>
              Enter your verification code
            </Heading>
            <Text tone="muted">Open your authenticator app and enter the code it shows for Acme.</Text>
          </Stack>
          <Stack as="form" gap="md" onSubmit={verify}>
            <TextField
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              error={fieldErrors.code}
            />
            <Button type="submit">Verify</Button>
          </Stack>
          <Button variant="ghost" onClick={() => go('start')}>
            Use a different way to sign in
          </Button>
        </>
      ) : step === 'link-sent' ? (
        <>
          <Stack gap="2xs">
            <Heading level={1} size={2}>
              Check your email
            </Heading>
            <Text tone="muted">{`We sent a sign-in link to ${email.trim()}. It works once and expires in 15 minutes.`}</Text>
          </Stack>
          <Button variant="secondary" onClick={() => go('start')}>
            Use a different email
          </Button>
        </>
      ) : (
        <>
          <Stack gap="2xs">
            <Heading level={1} size={2}>
              Sign in to Acme
            </Heading>
            <Text tone="muted">Use your work account.</Text>
          </Stack>

          {error ? <Banner tone="danger">{error}</Banner> : null}

          <Button onClick={() => undefined}>Continue with SSO</Button>

          <Cluster justify="center">
            <Text size="caption" tone="muted">
              or
            </Text>
          </Cluster>

          {step === 'password' ? (
            <Stack as="form" gap="md" onSubmit={signInWithPassword}>
              <TextField
                label="Work email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldErrors.email}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={fieldErrors.password}
              />
              <Button type="submit" variant="secondary">
                Sign in
              </Button>
              <Link href="/reset-password">Forgot your password?</Link>
            </Stack>
          ) : (
            <Stack as="form" gap="md" onSubmit={sendLink}>
              <TextField
                label="Work email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldErrors.email}
              />
              <Button type="submit" variant="secondary">
                Email me a sign-in link
              </Button>
            </Stack>
          )}

          <Button variant="ghost" onClick={() => go(step === 'password' ? 'start' : 'password')}>
            {step === 'password' ? 'Email me a sign-in link instead' : 'Sign in with a password instead'}
          </Button>
        </>
      )}
    </AuthLayout>
  );
}
