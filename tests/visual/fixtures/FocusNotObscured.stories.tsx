import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Check fixture for SC 2.4.11 (tests/visual/wcag22.spec.ts): a scroll container with a sticky
 * action bar and no scroll-padding. Tabbing down the list scrolls each button just into view at
 * the container's end, right under the bar, so the focus-not-obscured check must fail it.
 * Hidden from the gallery and from the screenshot and axe suite.
 */
const meta = {
  title: 'Check fixtures/Focus not obscured',
  tags: ['check-fixture', 'expect:focus-not-obscured', '!dev', '!autodocs', 'no-visual'],
  render: () => (
    <div style={{ blockSize: 240, overflow: 'auto', border: '1px solid' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <button type="button" key={i} style={{ blockSize: 32 }}>
            {`Row ${String(i + 1)}`}
          </button>
        ))}
      </div>
      <div style={{ position: 'sticky', insetBlockEnd: 0, blockSize: 64, background: 'Canvas', borderBlockStart: '1px solid' }}>Action bar</div>
    </div>
  ),
} satisfies Meta;

export default meta;
export const StickyBarWithoutScrollPadding: StoryObj<typeof meta> = {};
