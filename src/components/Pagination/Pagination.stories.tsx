import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Pagination } from './Pagination';

const meta = {
  title: 'Components/Pagination',
  component: Pagination,
  args: { page: 1, pageSize: 25, total: 1284, onPageChange: () => undefined },
  render: function Render(args) {
    const [page, setPage] = useState(args.page);
    return <Pagination {...args} page={page} onPageChange={setPage} />;
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {};
export const MiddlePage: Story = { args: { page: 12 } };
export const LastPage: Story = { args: { page: 52 } };
export const FewPages: Story = { args: { page: 2, total: 60 } };
export const SinglePage: Story = { args: { total: 7 } };
export const Narrow: Story = {
  args: { page: 12 },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
