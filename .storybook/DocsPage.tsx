import { ArgTypes, Description, Primary, Stories, Subtitle, Title, Unstyled, useOf } from '@storybook/addon-docs/blocks';
import { usageForTitle } from '../docs/usage/registry';
import { UsageSection } from '../docs/usage/UsageSection';

/**
 * Every component's Docs tab: title and description, the usage section from
 * docs/usage/<Name>.usage.tsx, then the primary story, the props table and the other stories.
 */
export function DocsPage() {
  const { preparedMeta } = useOf('meta', ['meta']);
  const usage = usageForTitle(preparedMeta.title);
  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      {usage ? (
        <Unstyled>
          <UsageSection usage={usage} />
        </Unstyled>
      ) : null}
      <Primary />
      <ArgTypes />
      <Stories />
    </>
  );
}
