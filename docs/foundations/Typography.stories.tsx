import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, vars } from '../../src/index';
import { DocPage, DocSection } from '../ui/DocPage';
import { ScaleTable, docsVar } from './ScaleTable';
import { primitives, resolveValue, token, tokens, varEntries } from './tokens';

interface Typography {
  fontFamily: string | string[];
  fontSize: { value: number; unit: string };
  fontWeight: number | string;
  lineHeight: number;
}

const describe = (path: string) => {
  const t = resolveValue(tokens, path) as Typography;
  const family = Array.isArray(t.fontFamily) ? t.fontFamily[0] : t.fontFamily;
  return `${String(t.fontSize.value)}${t.fontSize.unit} / ${String(t.lineHeight)} · weight ${String(t.fontWeight)} · ${family ?? ''}`;
};

function TypographyPage() {
  const styles = varEntries(vars.text, 'text');
  const sizes = primitives('dimension').filter((t) => t.path.startsWith('font.size.'));
  return (
    <DocPage
      title="Typography"
      lead="Named text styles, each a complete font shorthand. Components pick a style; they never set a size, weight or line height on their own."
    >
      <DocSection
        title="Text styles"
        intro="Use as font: var(--text-…) in system CSS, or through Heading and Text in product code. Heading levels follow the outline; size can differ from level when the design needs it."
      >
        <Table caption="Text styles">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Style</TableHeaderCell>
              <TableHeaderCell>Sample</TableHeaderCell>
              <TableHeaderCell>Resolves to</TableHeaderCell>
              <TableHeaderCell>Use for</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {styles.map(({ path, ref }) => (
              <TableRow key={path}>
                <TableCell rowHeader>
                  <code>{ref.slice(4, -1)}</code>
                </TableCell>
                <TableCell>
                  <span className="docs-type-sample" style={docsVar('--docs-font', ref)}>
                    Review the renewal terms
                  </span>
                </TableCell>
                <TableCell>
                  <Text as="span" size="caption" tone="muted">
                    {describe(path)}
                  </Text>
                </TableCell>
                <TableCell>{token(path).description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Families and weights">
        <Stack gap="lg">
          <ScaleTable caption="Font families" entries={varEntries(vars.font.family, 'font.family')} />
          <ScaleTable caption="Font weights" entries={varEntries(vars.font.weight, 'font.weight')} />
        </Stack>
      </DocSection>
      <DocSection
        title="Size scale (reference only)"
        intro="The primitive sizes the text styles are built from. Don’t use them directly: pick a text style, or propose a new one."
      >
        <Table caption="Font size primitives">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Primitive</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sizes.map((t) => {
              const { value, unit } = resolveValue(tokens, t.path) as { value: number; unit: string };
              return (
                <TableRow key={t.path}>
                  <TableCell rowHeader>
                    <code>{t.path}</code>
                  </TableCell>
                  <TableCell>
                    <code>
                      {String(value)}
                      {unit}
                      {unit === 'rem' ? ` (${String(value * 16)}px)` : ''}
                    </code>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Typography', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const Typography: StoryObj = { render: () => <TypographyPage /> };
