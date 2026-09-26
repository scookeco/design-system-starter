// @expect no-restricted-imports /format is the one formatting system/
// @as src/format/fixture.ts
import { DateFormatter } from '@internationalized/date';

export const fixture = new DateFormatter('en-US');
