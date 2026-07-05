import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@cloudflare/kumo/components/link';
import { Text } from '@cloudflare/kumo/components/text';
import { init } from '@twilic/core/advanced';

import {
  isPlaygroundPageId,
  PlaygroundLayout,
  PLAYGROUND_PAGE_IDS,
  type PlaygroundPageId,
} from './PlaygroundLayout.js';
import { SchemaComparisonPage } from './SchemaComparisonPage.js';
import { SizeComparisonPage } from './SizeComparisonPage.js';

type TwilicRuntime = Awaited<ReturnType<typeof init>>;

const pageCopy: Record<PlaygroundPageId, { title: string; description: ReactNode }> = {
  sizes: {
    title: 'Encoded size comparison',
    description: (
      <>
        Compare encoded sizes with{' '}
        <Link href="https://github.com/twilic/benchmark" target="_blank" rel="noreferrer">
          benchmark
        </Link>{' '}
        rules (MessagePack, CBOR, BSON, JSON). Uses local{' '}
        <Link href="https://github.com/twilic/twilic-js" target="_blank" rel="noreferrer">
          twilic-js
        </Link>{' '}
        (WASM).
      </>
    ),
  },
  schema: {
    title: 'Schema-first comparison',
    description: (
      <>
        Compare Twilic Bound profile (
        <Text variant="mono" as="span">
          encodeWithSchema
        </Text>
        ) against Protobuf and schema-less Twilic on the same records. Schema matches{' '}
        <Link
          href="https://github.com/twilic/twilic/blob/main/examples/schema-example.json"
          target="_blank"
          rel="noreferrer"
        >
          schema-example.json
        </Link>
        .
      </>
    ),
  },
};

function getPageFromUrl(): PlaygroundPageId {
  const page = new URLSearchParams(window.location.search).get('page');

  if (isPlaygroundPageId(page)) {
    return page;
  }

  return PLAYGROUND_PAGE_IDS[0];
}

export default function App() {
  const [activePage, setActivePage] = useState<PlaygroundPageId>(() => getPageFromUrl());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [runtime, setRuntime] = useState<TwilicRuntime | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNavigate = (page: PlaygroundPageId) => {
    setActivePage(page);

    const url = new URL(window.location.href);

    url.searchParams.set('page', page);

    window.history.pushState(window.history.state, '', url.toString());
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const kind = await init({ prefer: 'wasm' });
        if (cancelled) {
          return;
        }
        setRuntime(kind);
        setStatus('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getPageFromUrl());
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const copy = pageCopy[activePage];

  return (
    <PlaygroundLayout
      activePage={activePage}
      onNavigate={handleNavigate}
      status={status}
      runtime={runtime}
      errorMessage={errorMessage}
      title={copy.title}
      description={copy.description}
    >
      {activePage === 'sizes' && <SizeComparisonPage ready={status === 'ready'} />}
      {activePage === 'schema' && <SchemaComparisonPage ready={status === 'ready'} />}
    </PlaygroundLayout>
  );
}
