import { FileUpload } from '../../src/index';
import type { UsageDoc } from './types';

const MB = 1024 * 1024;
const noop = () => undefined;

export const usage: UsageDoc = {
  covers: [FileUpload],
  whenToUse: [
    'Attaching files to a record or a form: contracts, receipts, images.',
    'Say the limits before anyone picks: `acceptText` (“PDF, PNG or JPG”) and `maxSize`. Pass the same types as `accept`; the component checks type and size on pick and on drop, and hands you the accepted files and the rejections with ready-made messages.',
    'You own the list: add accepted files to `files`, set `progress` while each uploads, set `error` on the one that failed, and remove on `onRemove`. Focus moves to the next file, or back to Choose files.',
  ],
  whenNotToUse: [
    { situation: 'Importing a spreadsheet of records', instead: 'a dedicated import flow (a `FocusedLayout` wizard) that maps columns and previews rows' },
    { situation: 'A person’s photo', instead: 'the same component with `multiple={false}` and an image `accept`, previewed in a `Frame`' },
  ],
  do: {
    caption: 'The limits are visible up front; each file shows its own progress or its own error.',
    render: () => (
      <FileUpload
        label="Attachments"
        accept={['.pdf', 'image/png', 'image/jpeg']}
        acceptText="PDF, PNG or JPG"
        maxSize={10 * MB}
        files={[
          { id: '1', name: 'Signed contract.pdf', size: 2.4 * MB, progress: 40 },
          { id: '2', name: 'Survey scan.png', size: 14 * MB, error: 'Larger than 10 MB. Choose a smaller file.' },
        ]}
        onFilesAdded={noop}
        onRemove={noop}
      />
    ),
  },
  dont: {
    caption: 'No limits until after the upload fails, and one error for the whole batch that doesn’t say which file.',
    render: () => <FileUpload label="Attachments" error="Some files could not be uploaded." files={[]} onFilesAdded={noop} onRemove={noop} />,
  },
  accessibility: [
    'The Choose files button is the primary path; dropping files on the area is an enhancement, declared with `data-drag-alternative` (WCAG 2.2 SC 2.5.7).',
    'A group named by the label. The button is described by the label, the limits and any error; `id` lands on it for an error summary link.',
    'Adding files is announced politely (“2 files added, 1 file not added”). Each upload is a `Progress` named by the file.',
    'Remove buttons are named per file (“Remove Signed contract.pdf”, “Cancel …” while uploading) and meet the 24px target size.',
  ],
};
