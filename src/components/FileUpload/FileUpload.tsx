import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../Button/Button';
import { Field, fieldIds } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { Progress } from '../Progress/Progress';
import './FileUpload.css';

/** A file in the list. The caller owns the list: it adds accepted files, reports progress and removes them. */
export interface FileUploadItem {
  id: string;
  name: string;
  /** Size in bytes. */
  size: number;
  /** Upload progress, 0–100. Set while uploading; leave undefined once it is done. */
  progress?: number;
  /** Why this file failed ("Upload failed. Try again."). Shown under its name with an icon. */
  error?: string;
}

/** A picked or dropped file that broke a limit, with a message ready to show. */
export interface FileRejection {
  file: File;
  reason: 'type' | 'size';
  message: string;
}

export interface FileUploadProps extends EscapeHatch {
  /** Visible label and the group's accessible name ("Attachments"). Required. */
  label: string;
  /** Supporting text above the limits. */
  description?: string;
  /** Error for the field as a whole ("Add at least one file"). Errors about one file go on that file. */
  error?: string;
  /** Id of the Choose files button, for an error summary link. Generated when omitted. */
  id?: string;
  /** Accepted types: extensions (".pdf") and MIME types ("image/png", "image/*"). Checked on pick and on drop. */
  accept?: readonly string[];
  /** The accepted types in words, shown to everyone before they pick ("PDF, PNG or JPG"). */
  acceptText?: string;
  /** Largest file allowed, in bytes. Shown with the types. */
  maxSize?: number;
  /** Allow more than one file per pick. */
  multiple?: boolean;
  /** Files picked so far, with their progress and errors. */
  files: readonly FileUploadItem[];
  /** Called with the files that passed the limits and the ones that didn't. */
  onFilesAdded: (accepted: File[], rejected: FileRejection[]) => void;
  /** Remove (or cancel) one file. Focus moves to the next file, or back to Choose files. */
  onRemove: (id: string) => void;
  /** Label of the button that opens the file picker: the primary way in. */
  browseLabel?: string;
  /** Text beside the button, for people who can drag. */
  dropText?: string;
  disabled?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
  return `${String(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`;
};

const matches = (file: File, accept: readonly string[]) =>
  accept.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith('.')) return file.name.toLowerCase().endsWith(r);
    if (r.endsWith('/*')) return file.type.toLowerCase().startsWith(r.slice(0, -1));
    return file.type.toLowerCase() === r;
  });

/**
 * Picks files with a button (the primary path) and, as an enhancement, accepts files dropped on
 * its area. Shows the accepted types and size limit up front, then each file with its progress,
 * its own error and a remove button. It validates type and size; the caller uploads.
 */
export function FileUpload({
  label,
  description,
  error,
  id,
  accept,
  acceptText,
  maxSize,
  multiple = true,
  files,
  onFilesAdded,
  onRemove,
  browseLabel = 'Choose files',
  dropText = 'or drop them here',
  disabled = false,
  UNSAFE_className,
  UNSAFE_style,
}: FileUploadProps) {
  const limits = [acceptText, maxSize === undefined ? undefined : `up to ${formatBytes(maxSize)} each`].filter(Boolean).join(', ');
  const help = [description, limits ? `${limits.charAt(0).toUpperCase()}${limits.slice(1)}.` : undefined].filter(Boolean).join(' ');
  const ids = fieldIds(useId(), help || undefined, error, id);
  const inputRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterRemove = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // After a removal the button that had focus is gone: move to the next file, or back to Choose files.
  useEffect(() => {
    const index = focusAfterRemove.current;
    if (index === null) return;
    focusAfterRemove.current = null;
    const next = files[index] ?? files[index - 1];
    (next ? removeButtons.current.get(next.id) : browseRef.current)?.focus();
  }, [files]);

  const add = (list: FileList | null) => {
    if (!list || disabled) return;
    const picked = multiple ? [...list] : [...list].slice(0, 1);
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    for (const file of picked) {
      if (accept?.length && !matches(file, accept)) {
        rejected.push({ file, reason: 'type', message: `This type isn’t accepted.${acceptText ? ` Use ${acceptText}.` : ''}` });
      } else if (maxSize !== undefined && file.size > maxSize) {
        rejected.push({ file, reason: 'size', message: `Larger than ${formatBytes(maxSize)}. Choose a smaller file.` });
      } else {
        accepted.push(file);
      }
    }
    const count = (n: number, what: string) => `${String(n)} ${n === 1 ? 'file' : 'files'} ${what}`;
    setAnnouncement([accepted.length ? count(accepted.length, 'added') : '', rejected.length ? count(rejected.length, 'not added') : ''].filter(Boolean).join(', '));
    onFilesAdded(accepted, rejected);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    add(event.target.files);
    // Reset, so picking the same file again still fires a change.
    event.target.value = '';
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  };

  const remove = (fileId: string) => {
    focusAfterRemove.current = files.findIndex((f) => f.id === fileId);
    onRemove(fileId);
  };

  return (
    <div className={cx('file-upload', UNSAFE_className)} style={UNSAFE_style} role="group" aria-labelledby={ids.labelId}>
      <Field ids={ids} label={label} description={help || undefined} error={error} nativeLabel={false}>
        <div
          className="file-upload__dropzone"
          data-state={dragging ? 'dragging' : undefined}
          data-drag-alternative="the Choose files button opens the system file picker"
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Icon name="upload" size="md" />
          <Button
            ref={browseRef}
            id={ids.controlId}
            variant="secondary"
            size="sm"
            disabled={disabled}
            aria-describedby={[ids.labelId, ids.describedBy].filter(Boolean).join(' ')}
            aria-invalid={error ? true : undefined}
            onClick={() => inputRef.current?.click()}
          >
            {browseLabel}
          </Button>
          <span className="file-upload__drop-text">{dropText}</span>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept={accept?.join(',')}
            multiple={multiple}
            disabled={disabled}
            onChange={onChange}
          />
        </div>
      </Field>
      {files.length > 0 ? (
        <ul className="file-upload__list" aria-label={`${label}: ${String(files.length)} ${files.length === 1 ? 'file' : 'files'}`}>
          {files.map((file) => {
            const uploading = !file.error && file.progress !== undefined && file.progress < 100;
            return (
              <li key={file.id} className="file-upload__item" data-status={file.error ? 'error' : uploading ? 'uploading' : 'done'}>
                <Icon name="file" size="md" />
                <div className="file-upload__body">
                  {uploading ? (
                    <Progress label={file.name} value={file.progress ?? 0} valueText={`${String(Math.round(file.progress ?? 0))}% of ${formatBytes(file.size)}`} />
                  ) : (
                    <>
                      <span className="file-upload__name">{file.name}</span>
                      {file.error ? (
                        <span className="file-upload__error">
                          <Icon name="danger" />
                          <span>{file.error}</span>
                        </span>
                      ) : (
                        <span className="file-upload__meta">
                          <Icon name="success" />
                          <span>{formatBytes(file.size)}, uploaded</span>
                        </span>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="file-upload__remove"
                  aria-label={`${uploading ? 'Cancel' : 'Remove'} ${file.name}`}
                  onClick={() => remove(file.id)}
                  ref={(node) => {
                    if (node) removeButtons.current.set(file.id, node);
                    else removeButtons.current.delete(file.id);
                  }}
                >
                  <Icon name="close" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
    </div>
  );
}
