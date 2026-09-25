import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignInPage } from './SignInPage';

const meta = {
  title: 'Examples/Sign in',
  component: SignInPage,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SignInPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Start: Story = {};
export const Password: Story = { args: { initialStep: 'password', initialEmail: 'sam.rivera@example.com' } };
export const SignInFailed: Story = {
  args: {
    initialStep: 'password',
    initialEmail: 'sam.rivera@example.com',
    initialError: 'That email and password don’t match. Try again, or email yourself a sign-in link.',
  },
};
export const LinkSent: Story = { args: { initialStep: 'link-sent', initialEmail: 'sam.rivera@example.com' } };
export const VerificationCode: Story = { args: { initialStep: 'verify' } };
