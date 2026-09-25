import { Badge, Card, CardBody, Cluster, Grid, Heading, Stack, Text } from '../../src/index';
import { inline } from '../ui/inline';
import type { UsageDoc, UsageExample } from './types';

function ExampleCard({ kind, example }: { kind: 'do' | 'dont'; example: UsageExample }) {
  return (
    <Card>
      <CardBody>
        <Cluster>
          <Badge tone={kind === 'do' ? 'success' : 'danger'}>{kind === 'do' ? 'Do' : 'Don’t'}</Badge>
        </Cluster>
        <div className="docs-example">{example.render()}</div>
        <Text size="caption" tone="muted">
          {inline(example.caption)}
        </Text>
      </CardBody>
    </Card>
  );
}

/** The usage section of a Docs tab, built from system components. */
export function UsageSection({ usage }: { usage: UsageDoc }) {
  return (
    <section className="docs-usage" aria-labelledby="usage-heading">
      <Stack gap="lg">
        <Heading level={2} id="usage-heading">
          Usage
        </Heading>
        <Grid min="lg" gap="lg">
          <Stack gap="sm">
            <Heading level={3}>When to use</Heading>
            <Stack as="ul" gap="xs">
              {usage.whenToUse.map((line) => (
                <li key={line}>{inline(line)}</li>
              ))}
            </Stack>
          </Stack>
          <Stack gap="sm">
            <Heading level={3}>When not to use</Heading>
            <Stack as="ul" gap="xs">
              {usage.whenNotToUse.map(({ situation, instead }) => (
                <li key={situation}>
                  {inline(situation)}: use {inline(instead)}.
                </li>
              ))}
            </Stack>
          </Stack>
        </Grid>
        <Stack gap="sm">
          <Heading level={3}>Do and don’t</Heading>
          <Grid min="lg" gap="md">
            <ExampleCard kind="do" example={usage.do} />
            <ExampleCard kind="dont" example={usage.dont} />
          </Grid>
        </Stack>
        <Stack gap="sm">
          <Heading level={3}>Accessibility</Heading>
          <Stack as="ul" gap="xs">
            {usage.accessibility.map((line) => (
              <li key={line}>{inline(line)}</li>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </section>
  );
}
