import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Change } from './Change';

const meta = {
  title: 'Components/Change',
  component: Change,
  args: { kind: 'insert', children: 'two times (2×)' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Change>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Word's marks: insertions and deletions in each author's colour, moves in green, a bar beside each changed paragraph. */
export const Kinds: Story = {
  render: () => (
    <DocumentViewer label="Changes">
      <Text size="body-lg">
        Liability will not exceed{' '}
        <Change kind="insert" author="Maya Okafor" color={3}>
          two times (2×)
        </Change>{' '}
        <Change kind="delete" author="Jon Park" color={1}>
          the total
        </Change>{' '}
        the fees paid in the prior twelve (12) months.
      </Text>
      <Text size="body-lg">
        <Change kind="move-from" author="Maya Okafor">
          Neither Party will solicit the other’s employees.
        </Change>{' '}
        Each Party will comply with applicable law.
      </Text>
      <Text size="body-lg">
        Notices go to the addresses above.{' '}
        <Change kind="move-to" author="Maya Okafor">
          Neither Party will solicit the other’s employees.
        </Change>
      </Text>
      <Text size="body-lg">This paragraph has no changes, so it has no bar.</Text>
    </DocumentViewer>
  ),
};

/** An agreement compared with its amendment: a clause changed, one deleted, one added, each in its author's colour. */
export const Compared: Story = {
  render: () => (
    <DocumentViewer label="Master services agreement compared with Amendment No. 1">
      <Clause id="liability" title="Limitation of Liability">
        <Clause id="cap" conspicuous>
          <Text size="body-lg">
            Each Party’s total aggregate liability will not exceed{' '}
            <Change kind="insert" author="Maya Okafor" color={3}>
              two times (2×)
            </Change>{' '}
            the fees paid or payable in the twelve (12) months before the claim.
          </Text>
        </Clause>
      </Clause>
      <Clause id="non-solicitation" title="Non-Solicitation" change={{ kind: 'delete', author: 'Jon Park', color: 1 }}>
        <Text size="body-lg">During the term and for twelve (12) months after, neither Party will solicit the other’s employees.</Text>
      </Clause>
      <Clause id="ai" title="AI Features" change={{ kind: 'insert', author: 'Maya Okafor', color: 3 }}>
        <Text size="body-lg">Provider will not use Customer Data to train generally available AI models without consent.</Text>
      </Clause>
    </DocumentViewer>
  ),
};
