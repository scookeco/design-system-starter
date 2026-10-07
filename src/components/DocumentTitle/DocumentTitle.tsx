import { useContext, type ReactNode } from 'react';
import { DocumentScopeContext } from '../Clause/documentIndex';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import { Text } from '../Text/Text';
import './DocumentTitle.css';

export interface DocumentTitleProps {
  /** The agreement's title ("Master Services Agreement"). Required. */
  title: string;
  /** Its number line, under the title ("Order Form No. OF-2026-0311 under Agreement No. MSA-2026-0142"). */
  number?: string;
  /** The preamble: who the parties are, and the defined terms for the document and each party (Term define). */
  children?: ReactNode;
}

/**
 * The top of an agreement in a DocumentViewer: its title and number, centred, then the preamble
 * that names the parties. The title is one level above the viewer's clauses (an h1 with the
 * default headingLevel of 2); inside AppShell, where PageHeader owns the h1, give the viewer
 * headingLevel={3}. Recitals follow it.
 */
export function DocumentTitle({ title, number, children }: DocumentTitleProps) {
  const doc = useContext(DocumentScopeContext);
  const level = Math.max(1, (doc?.headingLevel ?? 2) - 1) as HeadingLevel;
  return (
    <header className="document-title">
      <div className="document-title__head">
        <Heading level={level} size={2}>
          {title}
        </Heading>
        {number ? <Text tone="muted">{number}</Text> : null}
      </div>
      {children ? <Text size="body-lg">{children}</Text> : null}
    </header>
  );
}

export interface RecitalsProps {
  /** One Recital per piece of background. Required. */
  children: ReactNode;
  /** What follows “NOW, THEREFORE,”. Default: in consideration of the mutual covenants set out below, the Parties agree as follows: */
  closing?: string;
}

/** The background before an agreement's operative clauses: “WHEREAS, …;” for each Recital, then “NOW, THEREFORE, …”. */
export function Recitals({ children, closing = 'in consideration of the mutual covenants set out below, the Parties agree as follows:' }: RecitalsProps) {
  return (
    <div className="recitals">
      {children}
      <Text size="body-lg">NOW, THEREFORE, {closing}</Text>
    </div>
  );
}

/** One recital, written without its “WHEREAS,” (it is added): “Provider operates a platform…;”. */
export function Recital({ children }: { children: ReactNode }) {
  return <Text size="body-lg">WHEREAS, {children}</Text>;
}
