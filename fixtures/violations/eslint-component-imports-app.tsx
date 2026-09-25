// @expect no-restricted-imports /never imports consumer code/
// @as src/components/Table/Fixture.tsx
import { useRecordList } from '../../app/model/queries';

export const Fixture = () => useRecordList;
