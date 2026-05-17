import { useEffect, useMemo, useState } from 'react';
import { Banner } from '@cloudflare/kumo/components/banner';
import { Button } from '@cloudflare/kumo/components/button';
import { InputArea } from '@cloudflare/kumo/components/input';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { Link } from '@cloudflare/kumo/components/link';
import { Loader } from '@cloudflare/kumo/components/loader';
import { Table } from '@cloudflare/kumo/components/table';
import { Text } from '@cloudflare/kumo/components/text';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';

import { buildBenchDataset } from './benchmarkPayloads.js';
import {
  measureBenchEncodedSizes,
  measureEncodedSizesForUserPayload,
  sanityCheckDecodes,
  type SizeComparisonRow,
} from './encodedSizes.js';
import { init } from '@twilic/core/advanced';

type TwilicRuntime = Awaited<ReturnType<typeof init>>;

function formatBytes(bytes: number): string {
  return bytes.toLocaleString('en-US');
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(2)}%`;
}

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [runtime, setRuntime] = useState<TwilicRuntime | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fixtureRows, setFixtureRows] = useState<SizeComparisonRow[]>([]);

  const dataset = useMemo(() => buildBenchDataset(), []);
  const defaultUserJsonText = useMemo(
    () => JSON.stringify(dataset.singleSmallJson, null, 2),
    [dataset],
  );
  const [userJsonText, setUserJsonText] = useState(defaultUserJsonText);

  const userSizing = useMemo(() => {
    if (status !== 'ready') {
      return {
        row: null as SizeComparisonRow | null,
        hint: null as string | null,
        hintIsError: false,
      };
    }
    try {
      const trimmed = userJsonText.trim();
      if (!trimmed) {
        return {
          row: null,
          hint: 'Paste JSON ({…} or […]) to add a row above the bench fixtures.',
          hintIsError: false,
        };
      }

      const parsed: unknown = JSON.parse(trimmed);
      return {
        row: measureEncodedSizesForUserPayload(parsed),
        hint: null,
        hintIsError: false,
      };
    } catch (error) {
      return {
        row: null,
        hint: error instanceof Error ? error.message : String(error),
        hintIsError: true,
      };
    }
  }, [userJsonText, status]);

  const displayRows = useMemo(() => {
    if (!userSizing.row) {
      return fixtureRows;
    }
    return [userSizing.row, ...fixtureRows];
  }, [fixtureRows, userSizing.row]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const kind = await init({ prefer: 'wasm' });
        if (cancelled) {
          return;
        }
        setRuntime(kind);
        sanityCheckDecodes(dataset);
        setFixtureRows(measureBenchEncodedSizes(dataset));
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
  }, [dataset]);

  const base = import.meta.env.BASE_URL;

  return (
    <div className="bg-kumo-base min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-2">
          <Text variant="heading1" as="h1">
            Encoding playground
          </Text>
          <Text variant="secondary" as="p">
            Compare encoded sizes with{' '}
            <Link href="https://github.com/twilic/benchmark" target="_blank" rel="noreferrer">
              benchmark
            </Link>{' '}
            rules. Uses local
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

        {status === 'ready' && fixtureRows.length > 0 && (
          <>
            <LayerCard>
              <LayerCard.Primary className="flex flex-col gap-4">
                <InputArea
                  label="Payload"
                  labelTooltip="Root object {…} or array […] for batch encode. BSON batches use records like the bench."
                  value={userJsonText}
                  onChange={(event) => {
                    setUserJsonText(event.target.value);
                  }}
                  rows={10}
                  error={userSizing.hintIsError && userSizing.hint ? userSizing.hint : undefined}
                  className="font-mono"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      try {
                        setUserJsonText(JSON.stringify(JSON.parse(userJsonText.trim()), null, 2));
                      } catch {
                        /* error shown on InputArea */
                      }
                    }}
                  >
                    Format
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setUserJsonText(defaultUserJsonText);
                    }}
                  >
                    Reset sample
                  </Button>
                </div>
                {userSizing.hint !== null && !userSizing.hintIsError && (
                  <Banner
                    icon={<InfoIcon weight="fill" />}
                    title="Tip"
                    description={userSizing.hint}
                  />
                )}
              </LayerCard.Primary>
            </LayerCard>

            <LayerCard className="p-0">
              <div className="overflow-x-auto">
                <Table layout="fixed" className="min-w-[720px]">
                  <colgroup>
                    <col />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-20" />
                  </colgroup>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Payload</Table.Head>
                      <Table.Head className="text-right">Twilic</Table.Head>
                      <Table.Head className="text-right">MsgPack</Table.Head>
                      <Table.Head className="text-right">CBOR</Table.Head>
                      <Table.Head className="text-right">BSON</Table.Head>
                      <Table.Head className="text-right">JSON</Table.Head>
                      <Table.Head className="text-right">vs mp</Table.Head>
                      <Table.Head className="text-right">vs cb</Table.Head>
                      <Table.Head className="text-right">vs bs</Table.Head>
                      <Table.Head className="text-right">vs js</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {displayRows.map((row, index) => {
                      const isUserRow = userSizing.row !== null && index === 0;
                      return (
                        <Table.Row
                          key={`${row.payload}:${index}`}
                          variant={isUserRow ? 'selected' : 'default'}
                        >
                          <Table.Cell>
                            <Text variant="mono" truncate>
                              {row.payload}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text bold size="sm" as="span">
                              {formatBytes(row.twilic)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text size="sm" as="span">
                              {formatBytes(row.msgpack)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text size="sm" as="span">
                              {formatBytes(row.cbor)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text size="sm" as="span">
                              {formatBytes(row.bson)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text size="sm" as="span">
                              {formatBytes(row.json)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text variant="success" size="sm" as="span">
                              {formatPct(row.vsMsgpackPct)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text variant="success" size="sm" as="span">
                              {formatPct(row.vsCborPct)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text variant="success" size="sm" as="span">
                              {formatPct(row.vsBsonPct)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            <Text variant="success" size="sm" as="span">
                              {formatPct(row.vsJsonPct)}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>
            </LayerCard>

            <Text variant="secondary" size="sm" as="p">
              Bytes per format. &ldquo;vs *&rdquo; = percent smaller than Twilic. Your row is
              highlighted when valid.
            </Text>
          </>
        )}
      </div>
    </div>
  );
}
