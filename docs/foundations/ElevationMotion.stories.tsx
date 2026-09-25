import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, vars } from '../../src/index';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { ScaleTable, docsVar } from './ScaleTable';
import { formatValue, reducedMotionValue, resolveValue, token, tokens, varEntries } from './tokens';

const shadow = (ref: string) => <span className="docs-elevation" style={docsVar('--docs-shadow', ref)} aria-hidden="true" />;

/** The easing curve, drawn from its resolved control points. */
function Curve({ path }: { path: string }) {
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = resolveValue(tokens, path) as number[];
  const p = (x: number, y: number) => `${String(x * 40 + 4)} ${String(44 - y * 40)}`;
  return (
    <svg className="docs-curve" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path className="docs-curve__axis" d={`M${p(0, 0)} H44 M${p(0, 0)} V4`} />
      <path className="docs-curve__line" d={`M${p(0, 0)} C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}`} />
    </svg>
  );
}

function ElevationMotionPage() {
  const durations = varEntries(vars.motion, 'motion');
  return (
    <DocPage
      title="Elevation and motion"
      lead="Shadows say how far a surface floats; stacking tokens say what sits on top. Motion is short, eased and optional: every duration that isn’t the only sign of progress drops to zero under reduced motion."
    >
      <DocSection title="Shadows" intro="One shadow per kind of surface. A component picks the surface it is; it never tunes a shadow.">
        <ScaleTable caption="Shadow tokens" entries={varEntries(vars.shadow, 'shadow')} preview={shadow} />
      </DocSection>
      <DocSection title="Stacking">
        <ScaleTable caption="Stacking tokens" entries={varEntries(vars.z, 'z')} />
      </DocSection>
      <DocSection title="Durations">
        <Table caption="Duration tokens">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Token</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>Reduced motion</TableHeaderCell>
              <TableHeaderCell>Use for</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {durations.map(({ path, ref }) => {
              const reduced = reducedMotionValue(path);
              return (
                <TableRow key={path}>
                  <TableCell rowHeader>
                    <code>{ref.slice(4, -1)}</code>
                  </TableCell>
                  <TableCell>
                    <code>{formatValue(path)}</code>
                  </TableCell>
                  <TableCell>{reduced ? <code>{reduced}</code> : 'Unchanged'}</TableCell>
                  <TableCell>{token(path).description}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Easings">
        <ScaleTable caption="Easing tokens" entries={varEntries(vars.ease, 'ease')} preview={(_ref, path) => <Curve path={path} />} />
      </DocSection>
      <DocSection title="Reduced motion">
        <Stack gap="sm">
          <Text>
            The token build writes a <code>prefers-reduced-motion: reduce</code> block into tokens.css from the source’s{' '}
            <code>reduced-motion</code> mode, so components get it without a media query of their own.
          </Text>
          <Rules
            items={[
              'Write transitions as longhands with a duration token; a literal duration fails lint and would not collapse.',
              'Anything that only decorates (hover fades, menus opening, skeleton pulse) collapses to 0ms.',
              'The spinner keeps turning: it is the only sign that work is in progress.',
              'Never convey state by motion alone. The end state must make sense without the animation.',
            ]}
          />
        </Stack>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Foundations/Elevation and motion', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const ElevationAndMotion: StoryObj = { name: 'Elevation and motion', render: () => <ElevationMotionPage /> };
