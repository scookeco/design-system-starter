/**
 * GOLDEN EXAMPLE: the import wizard (a CSV of records into the workspace). The wizard archetype
 * (SetupWizard) with real data: later steps depend on earlier ones, and the last one is a job.
 * No CSS file, no className, no style.
 *
 * Anatomy:
 *   frame    FocusedLayout: brand · the task · Exit import | column (Stepper first) | Back · Next
 *   steps    Upload → Map columns → Review → Import
 *   upload   FileUpload with its limits up front (CSV, 1 MB, 1,000 rows); the file is read here,
 *            nothing is sent until Import
 *   map      one row per field (IMPORT_FIELDS, from the field registry's config): the CSV column
 *            it reads, pre-selected by name, with an example value; required fields and a column
 *            used twice stop Next, with the reason
 *   review   every row checked with the same rules the server runs (src/app/model/importRules.ts):
 *            how many are ready, and each row with a problem, by row number, field and fix; rows
 *            with problems are skipped, and can be downloaded to fix
 *   import   a job (src/app/model/jobs.ts): Queued → "20 of 43" → Imported, or a partial failure
 *            listing each failed row with Retry failed and Download; it carries on if you leave
 *            (the header's jobs indicator follows it)
 *
 * Focus moves to each step's h1, like the setup wizard; a failed Next focuses the problem.
 */
import { useEffect, useRef, useState, type FormEvent, type Ref } from 'react';
import {
  Banner,
  Button,
  Cluster,
  CloseIcon,
  DownloadIcon,
  FileUpload,
  FocusedLayout,
  Link,
  PageHeader,
  Progress,
  Select,
  Stack,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  useFormat,
  type FileUploadItem,
  type Formatter,
} from '../index';
import type { Job } from '../app/api/schemas';
import { parseCsv, toCsv, type ParsedCsv } from '../app/model/csv';
import { saveFile } from '../app/model/download';
import { guessMapping, IMPORT_LIMITS, mappingProblems, mapRows, previewImport, type ColumnMapping, type ImportContext } from '../app/model/importRules';
import { useRetryJob, useStartImport } from '../app/model/imports';
import { isActiveJob, jobProgressText } from '../app/model/jobs';
import { useCancelJob } from '../app/model/mutations';
import { useAccounts, useJobs, usePeople } from '../app/model/queries';
import { IMPORT_FIELDS } from '../app/registries/recordFields';
import { useSession } from '../app/session';
import { useTenant } from '../app/tenant';
import { useNavigate } from '../app/url/useUrlState';
import { WORKSPACES } from '../app/workspaces';

const STEPS = [
  { label: 'Upload', title: 'Choose a file to import', description: 'A spreadsheet saved as CSV, with a header row. Each row becomes a record.' },
  { label: 'Map columns', title: 'Match columns to fields', description: 'We matched what we could by name. Check each one; a field with no column gets its default.' },
  { label: 'Review', title: 'Review before importing', description: 'Every row is checked with the same rules the import uses. Rows with problems are skipped.' },
  { label: 'Import', title: 'Importing', description: 'The import runs on the server. You can leave this page: its progress shows in the header.' },
] as const;

const FILE_FIELD = 'import-file';
const MAPPING_SUMMARY = 'import-mapping-problems';
const NONE = '-1';

/** A file the person picked, read: its name, size and parsed rows, or why it can't be imported. */
export interface PickedFile {
  name: string;
  text: string;
}

interface ReadFile {
  item: FileUploadItem;
  csv?: ParsedCsv;
}

/** Read a CSV the way the import will: headers, rows, and the problem with the file as a whole, if any. */
const readFile = (file: PickedFile, format: Formatter): ReadFile => {
  const csv = parseCsv(file.text);
  const size = new TextEncoder().encode(file.text).length;
  const item = { id: file.name, name: file.name, size };
  if (csv.headers.length === 0) return { item: { ...item, error: 'This file is empty. Choose a CSV with a header row and at least one row under it.' } };
  if (csv.rows.length === 0) return { item: { ...item, error: 'This file has a header row but no rows under it.' } };
  if (csv.rows.length > IMPORT_LIMITS.maxRows)
    return { item: { ...item, error: `This file has ${format.number(csv.rows.length)} rows. Import up to ${format.number(IMPORT_LIMITS.maxRows)} at a time: split it into smaller files.` } };
  return { item, csv };
};

export interface ImportWizardProps {
  /** Start on this step (gallery and tests). */
  initialStep?: number;
  /** A file already picked (gallery and tests: a story can't pick a file). */
  initialFile?: PickedFile;
  /** Override the pre-selected mapping (field id → column index, -1 for none). */
  initialMapping?: Partial<ColumnMapping>;
  /** Render as if Next was just pressed on an invalid step. */
  initialAttempted?: boolean;
  /** Follow this job on the Import step (gallery and tests: a job seeded with mockApi({ jobs })). */
  initialJobId?: string;
}

export function ImportWizard({ initialStep = 0, initialFile, initialMapping, initialAttempted = false, initialJobId }: ImportWizardProps) {
  const format = useFormat();
  const navigate = useNavigate();
  const tenant = useTenant();
  const me = useSession().user;
  const people = usePeople();
  const accounts = useAccounts();
  const start = useStartImport();
  const [step, setStep] = useState(initialStep);
  const [file, setFile] = useState<ReadFile | undefined>(() => (initialFile ? readFile(initialFile, format) : undefined));
  const [mapping, setMapping] = useState<ColumnMapping>(() => ({ ...guessMapping(initialFile ? parseCsv(initialFile.text).headers : []), ...initialMapping }));
  const [attempted, setAttempted] = useState<readonly number[]>(initialAttempted ? [initialStep] : []);
  const [jobId, setJobId] = useState(initialJobId);
  const idempotencyKey = useRef<string | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const csv = file?.csv;
  const headers = csv?.headers ?? [];
  const problems = mappingProblems(mapping, headers);
  const context: ImportContext | undefined =
    people.data && accounts.data
      ? {
          people: people.data,
          accounts: accounts.data,
          currency: WORKSPACES[tenant].currency,
          defaultOwnerId: people.data.find((p) => p.email === me.email)?.id ?? people.data[0]?.id ?? '',
          today: new Date().toISOString().slice(0, 10),
        }
      : undefined;
  const rows = csv ? mapRows(csv.rows, mapping) : [];
  const preview = context ? previewImport(rows, context) : undefined;
  const shown = (s: number) => attempted.includes(s);
  const meta = STEPS[step] ?? STEPS[0];

  const pick = async (picked: File[], rejected: { message: string; file: File }[]) => {
    const [first] = picked;
    if (!first) {
      const [why] = rejected;
      if (why) setFile({ item: { id: why.file.name, name: why.file.name, size: why.file.size, error: why.message } });
      return;
    }
    const read = readFile({ name: first.name, text: await first.text() }, format);
    setFile(read);
    if (read.csv) setMapping(guessMapping(read.csv.headers));
  };

  const fail = (target: string) => {
    setAttempted((current) => [...current, step]);
    window.requestAnimationFrame(() => document.getElementById(target)?.focus());
  };

  const next = (event: FormEvent) => {
    event.preventDefault();
    if (step === 0 && !csv) return fail(FILE_FIELD);
    if (step === 1 && problems.length > 0) return fail(MAPPING_SUMMARY);
    if (step === 2) {
      if (!preview || preview.ready.length === 0) return fail(MAPPING_SUMMARY);
      idempotencyKey.current ??= crypto.randomUUID();
      start.mutate(
        { rows: preview.ready, file: file?.item.name ?? 'a file', idempotencyKey: idempotencyKey.current },
        {
          onSuccess: (job) => {
            setJobId(job.id);
            setStep(3);
          },
        },
      );
      return;
    }
    setStep(step + 1);
  };

  const formId = 'import-step';
  const onImport = step === 3;

  return (
    <FocusedLayout
      brand={WORKSPACES[tenant].name}
      task="Import records"
      exit={
        <Button variant="ghost" icon={CloseIcon} onClick={() => navigate('/records')}>
          {onImport ? 'Close' : 'Exit import'}
        </Button>
      }
      footer={
        onImport ? (
          <Cluster justify="end">
            <Button onClick={() => navigate('/records')}>Go to records</Button>
          </Cluster>
        ) : (
          <Cluster justify="between">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" form={formId} loading={start.isPending}>
              {step === 2 && preview ? `Import ${format.number(preview.ready.length)} ${preview.ready.length === 1 ? 'record' : 'records'}` : 'Next'}
            </Button>
          </Cluster>
        )
      }
    >
      <Stepper label="Import steps" steps={STEPS} current={step} />
      {onImport ? (
        <ImportProgress jobId={jobId} headingRef={headingRef} onRetried={setJobId} />
      ) : (
        <>
          <PageHeader title={meta.title} description={meta.description} headingRef={headingRef} />
          <Stack as="form" id={formId} gap="md" onSubmit={next}>
            {step === 0 ? (
              <Stack gap="sm">
                <FileUpload
                  id={FILE_FIELD}
                  label="CSV file"
                  description={`Columns can be in any order: you’ll match them to fields next. Up to ${format.number(IMPORT_LIMITS.maxRows)} rows.`}
                  accept={['.csv', 'text/csv']}
                  acceptText="CSV"
                  maxSize={IMPORT_LIMITS.maxBytes}
                  multiple={false}
                  files={file ? [file.item] : []}
                  onFilesAdded={(accepted, rejected) => void pick(accepted, rejected)}
                  onRemove={() => setFile(undefined)}
                  error={shown(0) && !file ? 'Choose a CSV file to import.' : undefined}
                />
                {csv ? (
                  <Text size="caption" tone="muted">
                    {`${format.number(csv.rows.length)} rows and ${format.number(csv.headers.length)} columns: ${format.list(csv.headers)}.`}
                  </Text>
                ) : null}
              </Stack>
            ) : null}
            {step === 1 && csv ? <MapColumns csv={csv} mapping={mapping} onChange={setMapping} problems={shown(1) ? problems : []} /> : null}
            {step === 2 ? <Review total={rows.length} preview={preview} failed={start.isError} /> : null}
          </Stack>
        </>
      )}
    </FocusedLayout>
  );
}

/** One row per importable field: the column it reads (or none), and an example value from the file. */
function MapColumns({ csv, mapping, onChange, problems }: { csv: ParsedCsv; mapping: ColumnMapping; onChange: (next: ColumnMapping) => void; problems: readonly string[] }) {
  const options = [{ value: NONE, label: 'Don’t import' }, ...csv.headers.map((header, i) => ({ value: String(i), label: header || `Column ${String(i + 1)}` }))];
  return (
    <Stack gap="md">
      {problems.length > 0 ? (
        <Banner id={MAPPING_SUMMARY} tabIndex={-1} tone="danger" announce={false} title={problems.length === 1 ? 'One thing to fix' : `${String(problems.length)} things to fix`}>
          <Stack as="ul" gap="2xs">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </Stack>
        </Banner>
      ) : null}
      <Table caption="Fields and the columns they read">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Field</TableHeaderCell>
            <TableHeaderCell>Column in your file</TableHeaderCell>
            <TableHeaderCell>Example</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {IMPORT_FIELDS.map((field) => {
            const column = mapping[field.id];
            const example = column === -1 ? undefined : csv.rows.map((r) => r[column] ?? '').find((v) => v.trim() !== '');
            return (
              <TableRow key={field.id}>
                <TableCell rowHeader>{field.required ? field.label : `${field.label} (optional)`}</TableCell>
                <TableCell>
                  <Select
                    label={`Column for ${field.label}`}
                    hideLabel
                    size="sm"
                    options={options}
                    value={String(column)}
                    onValueChange={(value) => onChange({ ...mapping, [field.id]: Number(value) })}
                  />
                </TableCell>
                <TableCell>
                  <Text as="span" size="caption" tone="muted">
                    {example ?? (column === -1 ? 'Not imported' : 'Empty in every row')}
                  </Text>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
}

/** Rows shown in the problems table; the rest are counted, and all of them are in the download. */
const PROBLEM_ROWS_SHOWN = 20;

function Review({ total, preview, failed }: { total: number; preview: ReturnType<typeof previewImport> | undefined; failed: boolean }) {
  const format = useFormat();
  if (!preview) return <Text tone="muted">Checking rows…</Text>;
  const { ready, invalid } = preview;
  const lines = invalid.flatMap((r) => r.problems.map((p) => ({ row: r.row, field: IMPORT_FIELDS.find((f) => f.id === p.field)?.label ?? p.field, message: p.message })));
  const download = () =>
    saveFile({
      filename: 'rows-with-problems.csv',
      contentType: 'text/csv',
      content: toCsv([['Row', 'Field', 'Problem'], ...lines.map((l) => [String(l.row), l.field, l.message])]),
    });
  return (
    <Stack gap="md">
      {failed ? (
        <Banner tone="danger" title="The import didn’t start">
          Nothing was imported. Check your connection and try again.
        </Banner>
      ) : null}
      {ready.length === 0 ? (
        <Banner id={MAPPING_SUMMARY} tabIndex={-1} tone="danger" announce={false} title="None of the rows can be imported">
          Fix the problems below in your file and choose it again, or go back and change which columns the fields read.
        </Banner>
      ) : (
        <Banner tone={invalid.length > 0 ? 'warning' : 'success'} title={`${format.number(ready.length)} of ${format.number(total)} rows are ready to import`}>
          {invalid.length > 0
            ? `${format.number(invalid.length)} ${invalid.length === 1 ? 'row has a problem and will be skipped' : 'rows have problems and will be skipped'}. Fix them in your file and import them afterwards.`
            : 'Every row passed. Nothing is imported until you choose Import.'}
        </Banner>
      )}
      {lines.length > 0 ? (
        <Stack gap="sm">
          <Table caption="Rows with problems">
            <TableHead>
              <TableRow>
                <TableHeaderCell numeric>Row</TableHeaderCell>
                <TableHeaderCell>Field</TableHeaderCell>
                <TableHeaderCell>Problem</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.slice(0, PROBLEM_ROWS_SHOWN).map((line) => (
                <TableRow key={`${String(line.row)}-${line.field}`}>
                  <TableCell numeric rowHeader>
                    {format.number(line.row)}
                  </TableCell>
                  <TableCell>{line.field}</TableCell>
                  <TableCell>{line.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Cluster gap="sm" align="center">
            <Button variant="secondary" size="sm" icon={DownloadIcon} onClick={download}>
              Download rows with problems
            </Button>
            {lines.length > PROBLEM_ROWS_SHOWN ? (
              <Text as="span" size="caption" tone="muted">
                {`Showing ${format.number(PROBLEM_ROWS_SHOWN)} of ${format.number(lines.length)}. The download has them all.`}
              </Text>
            ) : null}
          </Cluster>
        </Stack>
      ) : null}
    </Stack>
  );
}

const TITLE: Record<Job['state'], (job: Job) => string> = {
  queued: () => 'Importing',
  running: () => 'Importing',
  succeeded: (job) => (job.failed.length > 0 ? 'Imported, with some rows failed' : 'Import finished'),
  failed: () => 'The import stopped',
  cancelled: () => 'Import cancelled',
};

/** The import's job, read from the jobs query the header polls too: truthful status, then what to do next. */
function ImportProgress({ jobId, headingRef, onRetried }: { jobId: string | undefined; headingRef: Ref<HTMLHeadingElement>; onRetried: (id: string) => void }) {
  const format = useFormat();
  const jobs = useJobs();
  const cancel = useCancelJob();
  const retry = useRetryJob();
  const job = jobs.data?.find((j) => j.id === jobId);
  if (!job) {
    return (
      <>
        <PageHeader title="Importing" description={STEPS[3].description} headingRef={headingRef} />
        {jobs.isError ? (
          <Banner tone="danger" title="The import’s progress didn’t load">
            The import may still be running. Check the jobs in the header, or try again.
          </Banner>
        ) : (
          <Progress label="Import" value={0} valueText="Starting…" />
        )}
      </>
    );
  }
  const imported = job.done - job.failed.length;
  const failed = job.failed.length;
  const download = () =>
    saveFile({ filename: 'rows-that-failed.csv', contentType: 'text/csv', content: toCsv([['Row', 'Reason'], ...job.failed.map((f) => [f.name, f.reason])]) });
  return (
    <>
      <PageHeader title={TITLE[job.state](job)} description={isActiveJob(job) ? STEPS[3].description : job.label} headingRef={headingRef} />
      <Stack gap="md">
        <Progress label={job.label} value={job.done} max={Math.max(job.total, 1)} valueText={jobProgressText(job, format)} />
        {isActiveJob(job) ? (
          <Cluster>
            <Button variant="secondary" loading={cancel.isPending} onClick={() => cancel.mutate(job.id)}>
              Cancel import
            </Button>
          </Cluster>
        ) : null}
        {job.state === 'succeeded' && failed === 0 ? (
          <Banner tone="success" title={`${format.number(imported)} ${imported === 1 ? 'record' : 'records'} imported`}>
            <Text>
              They’re drafts unless your file said otherwise. <Link href="/records">See them in Records</Link>.
            </Text>
          </Banner>
        ) : null}
        {job.state === 'failed' ? <Banner tone="danger" title="The import stopped">{job.error ?? 'The server stopped the import.'}</Banner> : null}
        {job.state === 'cancelled' ? (
          <Banner tone="info" title="Cancelled">
            {`${format.number(imported)} ${imported === 1 ? 'record was' : 'records were'} imported before you cancelled; the rest weren’t.`}
          </Banner>
        ) : null}
        {!isActiveJob(job) && failed > 0 ? (
          <Stack gap="sm">
            <Banner
              tone="warning"
              title={`${format.number(imported)} imported, ${format.number(failed)} failed`}
              action={
                <Button variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(job, { onSuccess: (next) => onRetried(next.id) })}>
                  {`Retry ${format.number(failed)} failed`}
                </Button>
              }
            >
              The rows below weren’t imported. Retry them, or download them to fix and import later.
            </Banner>
            <Table caption="Rows that failed">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Row</TableHeaderCell>
                  <TableHeaderCell>Reason</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {job.failed.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell rowHeader>{f.name}</TableCell>
                    <TableCell>{f.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Cluster>
              <Button variant="secondary" size="sm" icon={DownloadIcon} onClick={download}>
                Download failed rows
              </Button>
            </Cluster>
          </Stack>
        ) : null}
      </Stack>
    </>
  );
}
