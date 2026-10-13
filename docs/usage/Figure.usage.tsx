import { Document, DocumentViewer, Figure, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Figure],
  whenToUse: ['An image, a diagram or a chart in a document, with its `caption`. Charts are SVG drawn from the chart tokens, so they print as drawn.'],
  whenNotToUse: [
    { situation: 'A chart on an app page', instead: 'the reports example’s charts' },
    { situation: 'An official seal', instead: '`Seal`' },
  ],
  do: {
    caption: 'A described image with a caption.',
    render: () => (
      <DocumentViewer>
        <Document label="Statement of work">
          <Figure caption="Figure 1. The three phases.">
            <svg viewBox="0 0 100 10" role="img" aria-label="Three phases">
              <rect width="100" height="10" fill="var(--color-chart-categorical-1)" />
            </svg>
          </Figure>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A caption as separate text: it isn’t tied to its figure.',
    render: () => (
      <DocumentViewer>
        <Document label="Statement of work">
          <Text>Figure 1. The three phases.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `figure` with a `figcaption`; the image or chart still needs its own alternative text.'],
};
