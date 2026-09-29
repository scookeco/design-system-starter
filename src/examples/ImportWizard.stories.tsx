import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleImportCsv, SAMPLE_IMPORT_FILE } from '../app/mocks/importSample';
import { mockApi, mockApiMeta } from '../app/mocks/storybook';
import { ImportWizard } from './ImportWizard';
import { Guard } from './Permission';

const sample = { name: SAMPLE_IMPORT_FILE, text: sampleImportCsv('acme') };

const meta = {
  title: 'Examples/Import wizard',
  component: ImportWizard,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof ImportWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first step: the file's limits are stated before anyone picks. */
export const Upload: Story = { parameters: mockApi({ url: '/import/records' }) };
/** Next with no file: the field says what's missing, and has focus. */
export const UploadMissing: Story = { args: { initialAttempted: true }, parameters: mockApi({ url: '/import/records' }) };
/** A file with a header row and nothing under it: the problem is on the file, in words. */
export const UploadEmptyFile: Story = { args: { initialFile: { name: 'empty.csv', text: 'Name,Owner,Amount\n' } }, parameters: mockApi({ url: '/import/records' }) };
/** A file read: its rows and columns, before anything is sent. */
export const FileChosen: Story = { args: { initialFile: sample }, parameters: mockApi({ url: '/import/records' }) };
/** Columns matched to fields by name, each with an example from the file. */
export const MapColumns: Story = { args: { initialStep: 1, initialFile: sample }, parameters: mockApi({ url: '/import/records' }) };
/** The required field left out and a column chosen twice: Next stops with both reasons. */
export const MappingProblems: Story = {
  args: { initialStep: 1, initialFile: sample, initialMapping: { name: -1, account: 1 }, initialAttempted: true },
  parameters: mockApi({ url: '/import/records' }),
};
/** Every row checked with the server's rules: 43 ready, 5 skipped, each problem by row and field. */
export const Review: Story = { args: { initialStep: 2, initialFile: sample }, parameters: mockApi({ url: '/import/records' }) };
/** The import as a job, a third of the way: truthful progress, and Cancel. */
export const Importing: Story = {
  args: { initialStep: 3, initialJobId: 'acme-job1' },
  parameters: mockApi({ url: '/import/records', jobs: [{ kind: 'import', state: 'running' }] }),
};
/** Finished with two rows failed: each listed with its reason, Retry failed, and a download. */
export const ImportedWithFailures: Story = {
  args: { initialStep: 3, initialJobId: 'acme-job1' },
  parameters: mockApi({ url: '/import/records', jobs: [{ kind: 'import', state: 'succeeded' }] }),
};
export const Imported: Story = {
  args: { initialStep: 3, initialJobId: 'acme-job1' },
  parameters: mockApi({ url: '/import/records', jobs: [{ kind: 'import', state: 'succeeded', failures: 0 }] }),
};
/** A viewer can't create records, so the route guard shows the 403 page in the wizard's place. */
export const AsViewerDenied: Story = {
  parameters: mockApi({ url: '/import/records', role: 'viewer' }),
  render: (args) => (
    <Guard capability="record:create" current="/records">
      <ImportWizard {...args} />
    </Guard>
  ),
};
