import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Figure } from './Figure';

const meta = {
  title: 'Components/Figure',
  component: Figure,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Figure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A diagram drawn from chart tokens, with its caption. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Statement of work">
        <Figure caption="Figure 1. Migration in three phases over twelve weeks.">
          <svg viewBox="0 0 300 40" role="img" aria-label="Three phases: plan, migrate, cut over">
            <rect x="0" y="8" width="90" height="24" fill="var(--color-chart-categorical-1)" />
            <rect x="100" y="8" width="120" height="24" fill="var(--color-chart-categorical-2)" />
            <rect x="230" y="8" width="70" height="24" fill="var(--color-chart-categorical-3)" />
          </svg>
        </Figure>
      </Document>
    </DocumentViewer>
  ),
};
