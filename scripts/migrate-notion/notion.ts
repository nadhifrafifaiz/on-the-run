/**
 * Shared Notion client + helpers used by discover, inspect, and migrate scripts.
 */
import { Client } from "@notionhq/client";

const token = process.env.NOTION_TOKEN;
if (!token) throw new Error("NOTION_TOKEN not set");

export const notion = new Client({ auth: token });

// Extract plain text from a rich_text array.
export function richText(rt: unknown): string {
  if (!Array.isArray(rt)) return "";
  return (rt as Array<{ plain_text: string }>).map((r) => r.plain_text).join("").trim();
}

// Best-effort title from a page/DB.
export function pageTitle(page: unknown): string {
  const p = page as {
    properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
    title?: Array<{ plain_text: string }>;
  };
  if (Array.isArray(p.title)) return richText(p.title) || "(untitled)";
  if (p.properties) {
    for (const [, prop] of Object.entries(p.properties)) {
      if (Array.isArray(prop.title)) return richText(prop.title) || "(untitled)";
    }
  }
  return "(untitled)";
}

// Resolve a database → its first data source id (Notion 2025-09 API model).
export async function getDefaultDataSourceId(databaseId: string): Promise<string> {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const sources = (db as unknown as { data_sources: Array<{ id: string }> }).data_sources ?? [];
  if (sources.length === 0) throw new Error(`Database ${databaseId} has no data sources.`);
  return sources[0].id;
}

// Iterate every row in a data source, calling `handler` per page.
export async function forEachRow(
  dataSourceId: string,
  handler: (page: unknown) => Promise<void> | void,
) {
  let cursor: string | undefined;
  let total = 0;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const row of res.results) {
      await handler(row);
      total += 1;
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return total;
}

// Iterate every child block of a block/page, calling `handler`.
export async function forEachChildBlock(
  blockId: string,
  handler: (block: unknown) => Promise<void> | void,
) {
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const b of res.results) await handler(b);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
}

// Row property helpers ------------------------------------------------------------
export function selectValue(prop: unknown): string | null {
  return (prop as { select?: { name?: string } })?.select?.name ?? null;
}

export function numberValue(prop: unknown): number | null {
  const n = (prop as { number?: number | null })?.number;
  return typeof n === "number" ? n : null;
}

export function dateStart(prop: unknown): string | null {
  return (prop as { date?: { start?: string } })?.date?.start ?? null;
}

export function richTextValue(prop: unknown): string {
  return richText((prop as { rich_text?: unknown })?.rich_text);
}

export function titleValue(prop: unknown): string {
  return richText((prop as { title?: unknown })?.title);
}
