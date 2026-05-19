import type { ReactNode } from 'react';
import { Banner } from '@cloudflare/kumo/components/banner';
import { Button } from '@cloudflare/kumo/components/button';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { Loader } from '@cloudflare/kumo/components/loader';
import { Text } from '@cloudflare/kumo/components/text';
import { WarningCircleIcon } from '@phosphor-icons/react';

export type PlaygroundPageId = 'sizes' | 'schema';

export interface PlaygroundLayoutProps {
  activePage: PlaygroundPageId;
  onNavigate: (page: PlaygroundPageId) => void;
  status: 'loading' | 'ready' | 'error';
  runtime: string | null;
  errorMessage: string | null;
  title: string;
  description: ReactNode;
  children: ReactNode;
}

const navItems: Array<{ id: PlaygroundPageId; label: string }> = [
  { id: 'sizes', label: 'Encoded sizes' },
  { id: 'schema', label: 'Schema-first' },
];

export function PlaygroundLayout({
  activePage,
  onNavigate,
  status,
  runtime,
  errorMessage,
  title,
  description,
  children,
}: PlaygroundLayoutProps) {
  const base = import.meta.env.BASE_URL;

  return (
    <div className="bg-kumo-base min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Text variant="heading1" as="h1">
              Twilic playground
            </Text>
            <Text variant="secondary" as="p">
              {description}
            </Text>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Playground sections">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activePage === item.id ? 'primary' : 'secondary'}
                size="sm"
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                }}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <Text variant="heading2" as="h2">
            {title}
          </Text>
        </header>

        <LayerCard>
          <LayerCard.Secondary>Status</LayerCard.Secondary>
          <LayerCard.Primary>
            {status === 'loading' && (
              <div className="flex items-center gap-2">
                <Loader size="sm" />
                <Text variant="secondary">Loading WASM…</Text>
              </div>
            )}
            {status === 'error' && (
              <Banner
                icon={<WarningCircleIcon weight="fill" />}
                variant="error"
                title="Initialization failed"
                description={
                  <>
                    {errorMessage}
                    <br />
                    <Text variant="mono-secondary" as="span">
                      Build ../twilic-js with pnpm build:wasm && pnpm build:ts
                    </Text>
                  </>
                }
              />
            )}
            {status === 'ready' && (
              <Text variant="secondary" as="p">
                Backend:{' '}
                <Text bold as="span">
                  {runtime ?? 'unknown'}
                </Text>
                {base !== '/' && (
                  <>
                    {' · Base URL: '}
                    <Text variant="mono" as="span">
                      {base}
                    </Text>
                  </>
                )}
              </Text>
            )}
          </LayerCard.Primary>
        </LayerCard>

        {children}
      </div>
    </div>
  );
}
