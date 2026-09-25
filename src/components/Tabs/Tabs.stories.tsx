import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../Text/Text';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

function RecordTabs({ defaultValue = 'overview', disableHistory = false }: { defaultValue?: string; disableHistory?: boolean }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabList label="Record sections">
        <Tab value="overview">Overview</Tab>
        <Tab value="activity">Activity</Tab>
        <Tab value="history" disabled={disableHistory}>
          History
        </Tab>
      </TabList>
      <TabPanel value="overview">
        <Text>Summary of the record and its owner.</Text>
      </TabPanel>
      <TabPanel value="activity">
        <Text>Recent changes, newest first.</Text>
      </TabPanel>
      <TabPanel value="history">
        <Text>Every version of the record.</Text>
      </TabPanel>
    </Tabs>
  );
}

const meta = { title: 'Components/Tabs', component: RecordTabs } satisfies Meta<typeof RecordTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SecondSelected: Story = { args: { defaultValue: 'activity' } };
export const DisabledTab: Story = { args: { disableHistory: true } };
