import type { ReactNode } from 'react';
import { Center, Heading, Stack, Text } from '../../src/index';

/** A Foundations or Guides page: one h1, a lead paragraph, then sections. Composed from the system. */
export function DocPage({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <Center as="article" max="lg" gutters="lg">
      <div className="docs-page">
        <Stack gap="xl">
          <Stack gap="sm">
            <Heading level={1}>{title}</Heading>
            <Text size="body-lg" tone="muted">
              {lead}
            </Text>
          </Stack>
          {children}
        </Stack>
      </div>
    </Center>
  );
}

/** A titled section of a DocPage. */
export function DocSection({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <Stack as="section" gap="md">
      <Stack gap="xs">
        <Heading level={2}>{title}</Heading>
        {intro ? <Text tone="muted">{intro}</Text> : null}
      </Stack>
      {children}
    </Stack>
  );
}

/** A bulleted list of short rules. */
export function Rules({ items }: { items: readonly ReactNode[] }) {
  return (
    <Stack as="ul" gap="xs">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Stack>
  );
}
