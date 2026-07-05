export const PLAYGROUND_PAGE_IDS = ['sizes', 'schema'] as const;
export type PlaygroundPageId = (typeof PLAYGROUND_PAGE_IDS)[number];

export function isPlaygroundPageId(value: string | null): value is PlaygroundPageId {
  return PLAYGROUND_PAGE_IDS.includes(value as PlaygroundPageId);
}
