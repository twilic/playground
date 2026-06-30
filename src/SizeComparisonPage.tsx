import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Banner } from '@cloudflare/kumo/components/banner';
import { Button } from '@cloudflare/kumo/components/button';
import { InputArea } from '@cloudflare/kumo/components/input';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { Link } from '@cloudflare/kumo/components/link';
import { Table } from '@cloudflare/kumo/components/table';
import { Text } from '@cloudflare/kumo/components/text';
import { InfoIcon, UploadSimpleIcon } from '@phosphor-icons/react';

import { buildBenchDataset } from './benchmarkPayloads.js';
import { formatUserPayloadText, parseUserPayloadText } from './userPayloadText.js';
import {
  measureBenchEncodedSizes,
  measureEncodedSizesForUserPayload,
  sanityCheckDecodes,
  type SizeComparisonRow,
} from './encodedSizes.js';

export interface SizeComparisonPageProps {
  ready: boolean;
}

function formatBytes(bytes: number): string {
  return bytes.toLocaleString('en-US');
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(2)}%`;
}

function payloadLabelFromFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'custom';
  }
  return trimmed.replace(/\.[^.]+$/, '') || trimmed;
}

export function SizeComparisonPage({ ready }: SizeComparisonPageProps) {
  const dataset = useMemo(() => buildBenchDataset(), []);
  const fixtureRows = useMemo(() => {
    if (!ready) {
      return [] as SizeComparisonRow[];
    }
    sanityCheckDecodes(dataset);
    return measureBenchEncodedSizes(dataset);
  }, [dataset, ready]);
  const defaultUserJsonText = useMemo(
    () => JSON.stringify(dataset.singleSmallJson, null, 2),
    [dataset],
  );
  const [userJsonText, setUserJsonText] = useState(defaultUserJsonText);
  const [userPayloadLabel, setUserPayloadLabel] = useState('custom');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const loadJsonFromFile = async (file: File) => {
    const text = await file.text();
    setUserJsonText(text);
    setUserPayloadLabel(payloadLabelFromFileName(file.name));
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void loadJsonFromFile(file);
    }
    event.target.value = '';
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void loadJsonFromFile(file);
    }
  };

  const userSizing = useMemo(() => {
    if (!ready) {
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
          hint: 'Paste or upload JSON ({…} or […]) or JSONL (one value per line) to add a row above the bench fixtures.',
          hintIsError: false,
        };
      }

      const parsed: unknown = parseUserPayloadText(trimmed);
      return {
        row: measureEncodedSizesForUserPayload(parsed, userPayloadLabel),
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
  }, [userJsonText, userPayloadLabel, ready]);

  const displayRows = useMemo(() => {
    if (!userSizing.row) {
      return fixtureRows;
    }
    return [userSizing.row, ...fixtureRows];
  }, [fixtureRows, userSizing.row]);

  if (!ready || fixtureRows.length === 0) {
    return null;
  }

  return (
    <>
      <LayerCard>
        <LayerCard.Primary
          className={`flex flex-col gap-4 ${isDragging ? 'ring-kumo-brand ring-2 ring-offset-2' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.jsonl,application/json,application/x-ndjson,text/json,text/plain"
            className="sr-only"
            onChange={handleFileInputChange}
          />
          <InputArea
            label="Payload"
            labelTooltip="Root object {…}, array […], or JSONL (one JSON value per line). BSON batches use records like the bench. You can also upload or drop a file."
            value={userJsonText}
            onChange={(event) => {
              setUserJsonText(event.target.value);
              setUserPayloadLabel('custom');
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
                fileInputRef.current?.click();
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <UploadSimpleIcon className="size-4" aria-hidden />
                Upload JSON / JSONL
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => {
                try {
                  setUserJsonText(formatUserPayloadText(userJsonText));
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
                setUserPayloadLabel('custom');
              }}
            >
              Reset sample
            </Button>
          </div>
          {userSizing.hint !== null && !userSizing.hintIsError && (
            <Banner icon={<InfoIcon weight="fill" />} title="Tip" description={userSizing.hint} />
          )}
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard className="w-full overflow-x-auto p-0">
        <Table layout="fixed" className="min-w-304">
          <colgroup>
            <col style={{ width: '11rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '6.5rem' }} />
          </colgroup>
          <Table.Header variant="compact">
            <Table.Row>
              <Table.Head sticky="left">Payload</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Twilic</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">MessagePack</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">CBOR</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">BSON</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">JSON</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">vs MessagePack</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">vs CBOR</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">vs BSON</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">vs JSON</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {displayRows.map((row, index) => {
              const isUserRow = userSizing.row !== null && index === 0;
              return (
                <Table.Row key={`${row.payload}:${index}`}>
                  <Table.Cell sticky="left">
                    <Text
                      variant="mono"
                      truncate
                      as="span"
                      DANGEROUS_className={
                        isUserRow
                          ? 'block max-w-[11rem] text-sm text-kumo-link'
                          : 'block max-w-[11rem] text-sm'
                      }
                    >
                      {row.payload}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text bold size="sm" as="span" variant={isUserRow ? 'success' : 'body'}>
                      {formatBytes(row.twilic)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text size="sm" as="span" variant={isUserRow ? 'success' : 'body'}>
                      {formatBytes(row.msgpack)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text size="sm" as="span" variant={isUserRow ? 'success' : 'body'}>
                      {formatBytes(row.cbor)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text size="sm" as="span" variant={isUserRow ? 'success' : 'body'}>
                      {formatBytes(row.bson)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text size="sm" as="span" variant={isUserRow ? 'success' : 'body'}>
                      {formatBytes(row.json)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text variant="success" size="sm" as="span">
                      {formatPct(row.vsMsgpackPct)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text variant="success" size="sm" as="span">
                      {formatPct(row.vsCborPct)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text variant="success" size="sm" as="span">
                      {formatPct(row.vsBsonPct)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                    <Text variant="success" size="sm" as="span">
                      {formatPct(row.vsJsonPct)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </LayerCard>

      <Text variant="secondary" size="sm" as="p">
        Bytes per format. &ldquo;vs …&rdquo; columns = percent smaller than Twilic. Your custom row
        uses link-colored text when valid. Bench rules match{' '}
        <Link href="https://github.com/twilic/benchmark" target="_blank" rel="noreferrer">
          benchmark
        </Link>
        .
      </Text>
    </>
  );
}
