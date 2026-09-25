import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Check fixture for SC 2.5.8 (tests/visual/wcag22.spec.ts): two 16px icon buttons 4px apart. Each
 * is under 24px and its 24px circle overlaps the other, so the target-size check must fail it.
 * Hidden from the gallery and from the screenshot and axe suite.
 */
const tiny = { inlineSize: 16, blockSize: 16, padding: 0 } as const;

const meta = {
  title: 'Check fixtures/Target size',
  tags: ['check-fixture', 'expect:target-size', '!dev', '!autodocs', 'no-visual'],
  render: () => (
    <div style={{ display: 'flex', gap: 4, padding: 16 }}>
      <button type="button" aria-label="Previous" style={tiny} />
      <button type="button" aria-label="Next" style={tiny} />
    </div>
  ),
} satisfies Meta;

export default meta;
export const TooSmallAndTooClose: StoryObj<typeof meta> = {};
