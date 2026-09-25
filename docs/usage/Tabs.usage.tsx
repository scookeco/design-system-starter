import { Tab, TabList, TabPanel, Tabs, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Tabs, TabList, Tab, TabPanel],
  whenToUse: [
    'Switching between views of the same record or object in place, on one page: overview, activity, history.',
    'Tabs or NavTabs? If choosing one only swaps panels and the URL stays the same, it is `Tabs`. If it changes the URL, it is `NavTabs`.',
  ],
  whenNotToUse: [
    { situation: 'Sections that are each their own route', instead: '`NavTabs`' },
    { situation: 'Moving between pages or areas of the app', instead: '`Nav`, or a settings sub-nav with `Nav`' },
    { situation: 'Steps that must be done in order', instead: 'a full-page form with sections' },
    { situation: 'Content people need to compare side by side', instead: 'one page with sections' },
  ],
  do: {
    caption: 'Short, parallel labels for views of one record.',
    render: () => (
      <Tabs defaultValue="overview">
        <TabList label="Record sections">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity">Activity</Tab>
        </TabList>
        <TabPanel value="overview">
          <Text>Summary of the record and its owner.</Text>
        </TabPanel>
        <TabPanel value="activity">
          <Text>Recent changes, newest first.</Text>
        </TabPanel>
      </Tabs>
    ),
  },
  dont: {
    caption: 'Tabs as a wizard: “Step 2” hides what step 1 required and lets people skip it.',
    render: () => (
      <Tabs defaultValue="1">
        <TabList label="Setup">
          <Tab value="1">Step 1</Tab>
          <Tab value="2">Step 2</Tab>
          <Tab value="3">Step 3</Tab>
        </TabList>
        <TabPanel value="1">
          <Text>Company details</Text>
        </TabPanel>
        <TabPanel value="2">
          <Text>Invite people</Text>
        </TabPanel>
        <TabPanel value="3">
          <Text>Choose a plan</Text>
        </TabPanel>
      </Tabs>
    ),
  },
  accessibility: [
    '`TabList` requires a `label`; tabs, panels and their relationships use the ARIA tabs pattern.',
    'Arrow keys move between tabs; Tab moves into the panel.',
  ],
};
