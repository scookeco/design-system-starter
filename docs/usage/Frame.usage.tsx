import { Frame, Grid, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

const preview = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 240"><rect width="160" height="240" fill="#e0e7ff"/><rect y="100" width="160" height="40" fill="#6366f1"/></svg>')}`;

export const usage: UsageDoc = {
  covers: [Frame],
  whenToUse: [
    'Media that must keep one shape whatever its source size: file previews, cover images, video, logos.',
    '`ratio` is a token: `square` (avatars, logos), `landscape` (4:3, file previews), `wide` (16:9, video and covers). The media fills the frame and is cropped, never stretched.',
  ],
  whenNotToUse: [
    { situation: 'A person’s picture', instead: '`Avatar`, which also falls back to initials' },
    { situation: 'Sizing a block that holds text', instead: 'let the text set the height' },
  ],
  do: {
    caption: 'Previews held to one ratio, so the grid lines up; the name beside each is its text.',
    render: () => (
      <Grid min="sm" gap="sm">
        {['Site plan.png', 'Floor two.png'].map((name) => (
          <Stack gap="2xs" key={name}>
            <Frame ratio="landscape">
              <img src={preview} alt="" />
            </Frame>
            <Text size="caption">{name}</Text>
          </Stack>
        ))}
      </Grid>
    ),
  },
  dont: {
    caption: 'A bare image: a tall source makes a tall tile, and the grid breaks.',
    render: () => (
      <Grid min="sm" gap="sm">
        <img src={preview} alt="" />
        <Text size="caption">Site plan.png</Text>
      </Grid>
    ),
  },
  accessibility: [
    'Layout only. The media keeps its own alternative: `alt=""` when a visible name sits beside it, a real description when it carries information.',
  ],
};
