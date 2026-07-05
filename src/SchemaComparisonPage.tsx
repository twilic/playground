import { useEffect, useMemo, useState } from 'react';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { Link } from '@cloudflare/kumo/components/link';
import { Loader } from '@cloudflare/kumo/components/loader';
import { Table } from '@cloudflare/kumo/components/table';
import { Text } from '@cloudflare/kumo/components/text';

import { Banner } from '@cloudflare/kumo/components/banner';
import { WarningCircleIcon } from '@phosphor-icons/react';

import { buildSchemaBenchScenarios } from './schemaComparison/fixtures.js';
import {
  measureAllSchemaScenarios,
  type SchemaSizeComparisonRow,
} from './schemaComparison/encodedSchemaSizes.js';

export interface SchemaComparisonPageProps {
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

export function SchemaComparisonPage({ ready }: SchemaComparisonPageProps) {
  const scenarios = useMemo(() => buildSchemaBenchScenarios(), []);
  const [rows, setRows] = useState<SchemaSizeComparisonRow[]>([]);
  const [measureError, setMeasureError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    measureAllSchemaScenarios(scenarios)
      .then((result) => {
        if (!cancelled) {
          setRows(result);
          setMeasureError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMeasureError(error instanceof Error ? error.message : String(error));
          setRows([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ready, scenarios]);

  const measuring = ready && rows.length === 0 && measureError === null;

  if (!ready) {
    return null;
  }

  if (measuring && rows.length === 0) {
    return (
      <LayerCard>
        <LayerCard.Primary className="flex items-center gap-2">
          <Loader size="sm" />
          <Text variant="secondary">Measuring schema-first encodings…</Text>
        </LayerCard.Primary>
      </LayerCard>
    );
  }

  if (measureError) {
    return (
      <Banner variant="error" icon={<WarningCircleIcon />} title="Measurement failed">
        {measureError}
      </Banner>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <>
      <LayerCard>
        <LayerCard.Secondary>Schema</LayerCard.Secondary>
        <LayerCard.Primary className="flex flex-col gap-2">
          <Text variant="secondary" as="p">
            Twilic Bound profile uses{' '}
            <Text variant="mono" as="span">
              encodeWithSchema
            </Text>{' '}
            on a shared{' '}
            <Link
              href="https://github.com/twilic/twilic/blob/main/examples/schema-example.json"
              target="_blank"
              rel="noreferrer"
            >
              UserRecordV1
            </Link>{' '}
            schema (
            <Text variant="mono" as="span">
              schemaId: 42
            </Text>
            ). Other columns use equivalent predeclared schemas (field order / IDs aligned where
            applicable).
          </Text>
          <Text variant="secondary" size="sm" as="p">
            <Text bold as="span">
              stream
            </Text>{' '}
            — concatenated per-record messages (schema agreed out-of-band).{' '}
            <Text bold as="span">
              pack / OCF / IPC
            </Text>{' '}
            — one container with schema metadata once (Protobuf{' '}
            <Text variant="mono" as="span">
              repeated
            </Text>
            , Avro OCF, FlatBuffers vector root, Arrow IPC stream).
          </Text>
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard className="w-full overflow-x-auto p-0">
        <Table layout="fixed" className="min-w-408">
          <colgroup>
            <col style={{ width: '11rem' }} />
            <col style={{ width: '7.5rem' }} />
            <col style={{ width: '7.5rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col style={{ width: '7.5rem' }} />
            <col style={{ width: '7rem' }} />
            <col style={{ width: '9.5rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col style={{ width: '7.5rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col style={{ width: '7.5rem' }} />
          </colgroup>
          <Table.Header variant="compact">
            <Table.Row>
              <Table.Head sticky="left">Payload</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Twilic bound</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Twilic dynamic</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Protobuf stream</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Protobuf pack</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Avro stream</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Avro OCF</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">FlatBuffers stream</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">FlatBuffers pack</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">Arrow IPC</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">vs best stream</Table.Head>
              <Table.Head className="text-right whitespace-nowrap">vs best pack</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.payload}>
                <Table.Cell sticky="left">
                  <span className="block max-w-44 truncate font-mono text-sm">{row.payload}</span>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text bold size="sm" as="span">
                    {formatBytes(row.twilicBound)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.twilicDynamic)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.protobuf.stream)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.protobuf.pack)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.avro.stream)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.avro.pack)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.flatbuffers.stream)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.flatbuffers.pack)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text size="sm" as="span">
                    {formatBytes(row.arrowIpc)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text variant="success" size="sm" as="span">
                    {formatPct(row.vsBestStreamPct)}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                  <Text variant="success" size="sm" as="span">
                    {formatPct(row.vsBestPackPct)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </LayerCard>

      <Text variant="secondary" size="sm" as="p">
        &ldquo;vs best stream / pack&rdquo; = percent smaller than Twilic bound vs the smallest
        schema-first baseline in that group (positive means Twilic is smaller). Dynamic Twilic omits
        upfront schema but carries per-value type information.
      </Text>
    </>
  );
}
