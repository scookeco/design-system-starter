import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Check fixture for SC 3.3.8 (tests/visual/wcag22.spec.ts): a sign-in form that gets everything
 * wrong. The password has no autocomplete and no show-password toggle, both fields block paste,
 * and a CAPTCHA asks for a cognitive test. The accessible-authentication check must fail it.
 * Hidden from the gallery and from the screenshot and axe suite.
 */
const blockPaste = (event: { preventDefault: () => void }) => event.preventDefault();

const meta = {
  title: 'Check fixtures/Accessible authentication',
  tags: ['check-fixture', 'expect:accessible-authentication', '!dev', '!autodocs', 'no-visual'],
  render: () => (
    <form style={{ display: 'grid', gap: 8, padding: 16, maxInlineSize: 320 }}>
      <label htmlFor="fixture-email">Email</label>
      <input id="fixture-email" type="email" onPaste={blockPaste} />
      <label htmlFor="fixture-password">Password</label>
      <input id="fixture-password" type="password" autoComplete="off" onPaste={blockPaste} />
      <div className="captcha" role="group" aria-label="Type the letters in the image">
        Type the letters in the image
      </div>
      <button type="submit">Sign in</button>
    </form>
  ),
} satisfies Meta;

export default meta;
export const EverythingWrong: StoryObj<typeof meta> = {};
