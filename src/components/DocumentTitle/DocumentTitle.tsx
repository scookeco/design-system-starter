import { createContext, useContext, type ReactNode } from 'react';
import { DocumentScopeContext } from '../Document/documentIndex';
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
 * The top of an agreement in a Document: its title and number, centred, then the preamble
 * that names the parties. The title is one level above the document's clauses (an h1 with the
 * default headingLevel of 2); inside AppShell, where PageHeader owns the h1, give the
 * Document headingLevel={3}. Recitals follow it.
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
  /** Starts each recital “WHEREAS,”, as older agreements write them. Default false: lettered A., B., C. alone. */
  whereas?: boolean;
  /** What follows “NOW, THEREFORE,” after the recitals. Omit it for none. */
  closing?: string;
}

const WhereasContext = createContext(false);

/**
 * The background before an agreement's operative clauses, lettered A., B., C. by a counter (never
 * typed), optionally each “WHEREAS, …;”, then, with `closing`, “NOW, THEREFORE, …”.
 */
export function Recitals({ children, whereas = false, closing }: RecitalsProps) {
  return (
    <WhereasContext value={whereas}>
      <section className="recitals" data-doc="recitals">
        {children}
        {closing ? <Text size="body-lg">NOW, THEREFORE, {closing}</Text> : null}
      </section>
    </WhereasContext>
  );
}

/** One recital: “Provider operates a platform…”. Its letter (and “WHEREAS,” when Recitals asks for it) is added. */
export function Recital({ children }: { children: ReactNode }) {
  const whereas = useContext(WhereasContext);
  return <p className="recital">{whereas ? <>WHEREAS, {children}</> : children}</p>;
}
