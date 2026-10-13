import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { DocumentList, DocumentListItem } from './DocumentList';

const meta = {
  title: 'Components/DocumentList',
  component: DocumentList,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentList>;

export default meta;
type Story = StoryObj<typeof meta>;

function Letter({ listStyle }: { listStyle?: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'disc' | 'none' }) {
  return (
    <DocumentViewer>
      <Document label="Offer letter">
        <Text size="body-lg">On your first day, please bring:</Text>
        <DocumentList listStyle={listStyle}>
          <DocumentListItem>a photo identification;</DocumentListItem>
          <DocumentListItem>your signed offer letter; and</DocumentListItem>
          <DocumentListItem>your bank details for payroll.</DocumentListItem>
        </DocumentList>
      </Document>
    </DocumentViewer>
  );
}

/** Bullets: a list in the text, not numbered provisions. */
export const Default: Story = { render: () => <Letter /> };

/** Numbered 1., 2., 3. (an ordered list). */
export const Decimal: Story = { render: () => <Letter listStyle="decimal" /> };

/** Lettered a., b., c. */
export const LowerAlpha: Story = { render: () => <Letter listStyle="lower-alpha" /> };

/** Lettered A., B., C. */
export const UpperAlpha: Story = { render: () => <Letter listStyle="upper-alpha" /> };

/** Roman i., ii., iii. */
export const LowerRoman: Story = { render: () => <Letter listStyle="lower-roman" /> };

/** No markers. */
export const NoMarkers: Story = { render: () => <Letter listStyle="none" /> };
