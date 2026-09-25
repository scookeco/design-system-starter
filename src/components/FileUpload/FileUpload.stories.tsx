import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileUpload, type FileUploadItem, type FileUploadProps } from './FileUpload';

const MB = 1024 * 1024;

const meta = {
  title: 'Components/FileUpload',
  component: FileUpload,
  args: {
    label: 'Attachments',
    accept: ['.pdf', 'image/png', 'image/jpeg'],
    acceptText: 'PDF, PNG or JPG',
    maxSize: 10 * MB,
    files: [],
    onFilesAdded: () => undefined,
    onRemove: () => undefined,
  },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithDescription: Story = { args: { description: 'Signed copies of the contract and any schedules.' } };

export const Uploading: Story = {
  args: {
    files: [
      { id: '1', name: 'Master services agreement.pdf', size: 2.4 * MB, progress: 64 },
      { id: '2', name: 'Schedule A.pdf', size: 380 * 1024, progress: 12 },
    ],
  },
};

export const Uploaded: Story = {
  args: {
    files: [
      { id: '1', name: 'Master services agreement.pdf', size: 2.4 * MB },
      { id: '2', name: 'Site plan.png', size: 5.1 * MB },
    ],
  },
};

export const FileErrors: Story = {
  args: {
    files: [
      { id: '1', name: 'Master services agreement.pdf', size: 2.4 * MB },
      { id: '2', name: 'Floor plan.dwg', size: 1.2 * MB, error: 'This type isn’t accepted. Use PDF, PNG or JPG.' },
      { id: '3', name: 'Survey scan.png', size: 14 * MB, error: 'Larger than 10 MB. Choose a smaller file.' },
    ],
  },
};

export const FieldError: Story = { args: { error: 'Add the signed contract before you submit.' } };

export const Disabled: Story = { args: { disabled: true } };

export const SingleFile: Story = { args: { multiple: false, browseLabel: 'Choose a file', dropText: 'or drop it here', label: 'Signed contract' } };

/** Working: picked and dropped files are validated, listed and removable. */
function Working(args: FileUploadProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  return (
    <FileUpload
      {...args}
      files={files}
      onFilesAdded={(accepted, rejected) =>
        setFiles((current) => [
          ...current,
          ...accepted.map((f) => ({ id: `${f.name}-${String(f.lastModified)}`, name: f.name, size: f.size })),
          ...rejected.map((r) => ({ id: `${r.file.name}-${String(r.file.lastModified)}`, name: r.file.name, size: r.file.size, error: r.message })),
        ])
      }
      onRemove={(id) => setFiles((current) => current.filter((f) => f.id !== id))}
    />
  );
}

export const Interactive: Story = { render: (args) => <Working {...args} /> };
