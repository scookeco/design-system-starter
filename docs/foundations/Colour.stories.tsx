import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { TEXT } from '../../scripts/checks/contrast-pairs';
import { Badge, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { DocPage, DocSection } from '../ui/DocPage';
import { colorRoles, dark, light, pairingFor, primitives, token } from './tokens';

/** A swatch painted with a resolved value. Values come from the token source, never typed here. */
function Swatch({ value }: { value: string }) {
  return <span className="docs-swatch" style={{ '--docs-swatch': value } as CSSProperties} aria-hidden="true" />;
}

/** The pair as it renders: text for text pairs, a stroke for 3:1 UI pairs. */
function PairSample({ fg, bg, text }: { fg: string; bg: string; text: boolean }) {
  const style = { '--docs-sample-fg': fg, '--docs-sample-bg': bg } as CSSProperties;
  return text ? (
    <span className="docs-sample" style={style}>
      Aa
    </span>
  ) : (
    <span className="docs-sample docs-sample--stroke" style={style} aria-hidden="true" />
  );
}

const ratio = (n: number) => `${n.toFixed(2)}:1`;
const group = (path: string): string => path.split('.').slice(1, -1).join('.') || (path.split('.')[1] ?? path);

function RoleRow({ path }: { path: string }) {
  const role = token(path);
  const pairing = pairingFor(path);
  const values = [light(path), dark(path)] as const;
  return (
    <TableRow>
      <TableCell rowHeader>
        <Stack gap="2xs">
          <code>{path}</code>
          {role.description ? (
            <Text as="span" size="caption" tone="muted">
              {role.description}
            </Text>
          ) : null}
        </Stack>
      </TableCell>
      {values.map((value, i) => (
        <TableCell key={i}>
          <span className="docs-swatch-row">
            <Swatch value={value} />
            <code>{value}</code>
          </span>
        </TableCell>
      ))}
      {pairing ? (
        <>
          <TableCell>
            <Stack gap="2xs">
              <code>{pairing.against}</code>
              <span className="docs-swatch-row">
                {(['light', 'dark'] as const).map((mode) => {
                  const fg = mode === 'light' ? light(pairing.pair.fg) : dark(pairing.pair.fg);
                  const bg = mode === 'light' ? light(pairing.pair.bg) : dark(pairing.pair.bg);
                  return <PairSample key={mode} fg={fg} bg={bg} text={pairing.pair.min >= TEXT} />;
                })}
              </span>
            </Stack>
          </TableCell>
          <TableCell numeric>
            <Stack gap="2xs">
              <span>
                {ratio(pairing.light)} · {ratio(pairing.dark)}
              </span>
              <Text as="span" size="caption" tone="muted">
                min {pairing.pair.min}:1{pairing.tested > 1 ? `, ${String(pairing.tested)} pairs tested` : ''}
              </Text>
            </Stack>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell>
            <Text as="span" size="caption" tone="muted">
              No pair
            </Text>
          </TableCell>
          <TableCell>
            <Badge tone="neutral" indicator="none">
              {path === 'color.fg.disabled' ? 'Exempt' : 'Decorative'}
            </Badge>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

function RoleTable({ name, paths }: { name: string; paths: string[] }) {
  return (
    <Table caption={name}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Role</TableHeaderCell>
          <TableHeaderCell>Light</TableHeaderCell>
          <TableHeaderCell>Dark</TableHeaderCell>
          <TableHeaderCell>Paired with (light · dark)</TableHeaderCell>
          <TableHeaderCell numeric>Contrast (light · dark)</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {paths.map((path) => (
          <RoleRow key={path} path={path} />
        ))}
      </TableBody>
    </Table>
  );
}

const GROUP_NAMES: Record<string, string> = {
  bg: 'Backgrounds',
  fg: 'Text and icons',
  border: 'Borders',
  action: 'Actions',
  focus: 'Focus',
};

function ColourPage() {
  const groups = new Map<string, string[]>();
  for (const { path } of colorRoles) {
    const key = path.startsWith('color.status.') ? `status.${path.split('.')[2] ?? ''}` : group(path);
    groups.set(key, [...(groups.get(key) ?? []), path]);
  }
  const ramps = new Map<string, { path: string; value: string }[]>();
  for (const t of primitives('color')) {
    const ramp = t.path.split('.').slice(0, -1).join('.') || t.path;
    ramps.set(ramp, [...(ramps.get(ramp) ?? []), { path: t.path, value: light(t.path) }]);
  }
  return (
    <DocPage
      title="Colour"
      lead="Every semantic colour role, in light and dark, with the contrast it is tested at. Values, pairs and ratios are read from the token source and the contrast check, so this page cannot drift from them."
    >
      <DocSection
        title="Semantic roles"
        intro="Use these, through var(--color-…) in system CSS. Each pair is checked in tests/unit/contrast.test.ts: 4.5:1 for text, 3:1 for control boundaries and focus."
      >
        {[...groups].map(([key, paths]) => (
          <RoleTable
            key={key}
            name={key.startsWith('status.') ? `Status: ${key.slice('status.'.length)}` : (GROUP_NAMES[key] ?? key)}
            paths={paths}
          />
        ))}
      </DocSection>
      <DocSection
        title="Primitives (reference only)"
        intro="The raw ramps the semantic roles point at. Don’t use them directly: system CSS that reads a primitive fails the build. Need a colour that isn’t a role? Propose a semantic token."
      >
        {[...ramps].map(([ramp, steps]) => (
          <Stack key={ramp} gap="xs">
            <Text as="span" size="caption" tone="muted">
              <code>{ramp}</code>
            </Text>
            <ul className="docs-ramp" aria-label={`${ramp} ramp`}>
              {steps.map((step) => (
                <li key={step.path} className="docs-ramp__step">
                  <Swatch value={step.value} />
                  <Text as="span" size="caption">
                    {step.path.split('.').at(-1)}
                  </Text>
                  <Text as="span" size="caption" tone="muted">
                    {step.value}
                  </Text>
                </li>
              ))}
            </ul>
          </Stack>
        ))}
      </DocSection>
    </DocPage>
  );
}

const meta = {
  title: 'Foundations/Colour',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const Colour: StoryObj = { render: () => <ColourPage /> };
