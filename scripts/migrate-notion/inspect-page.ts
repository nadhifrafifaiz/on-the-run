/**
 * Inspect a single Notion page by ID and dump its blocks (with text preview)
 * so we can decide how to parse it.
 *
 * Usage: npm run notion:inspect <pageId>
 */
import { Client } from "@notionhq/client";

const token = process.env.NOTION_TOKEN;
if (!token) throw new Error("NOTION_TOKEN not set");
const pageId = process.argv[2];
if (!pageId) throw new Error("Usage: tsx scripts/migrate-notion/inspect-page.ts <pageId>");

const notion = new Client({ auth: token });

function textFromRich(rich: unknown): string {
  if (!Array.isArray(rich)) return "";
  return (rich as Array<{ plain_text: string }>).map((r) => r.plain_text).join("").trim();
}

async function main() {
  console.log(`Inspecting page: ${pageId}\n`);
  let cursor: string | undefined;
  const depth = 0;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of res.results) {
      const b = block as {
        id: string;
        type: string;
        [k: string]: unknown;
      };
      const indent = "  ".repeat(depth);
      const type = b.type;
      const content = (b[type] ?? {}) as { rich_text?: unknown; title?: string; text?: unknown };
      const text = content.rich_text ? textFromRich(content.rich_text) : "";
      const title =
        (b as { child_page?: { title: string }; child_database?: { title: string } }).child_page?.title ??
        (b as { child_database?: { title: string } }).child_database?.title ??
        text;
      console.log(`${indent}[${type}] ${title.slice(0, 120)}${title.length > 120 ? "…" : ""}  (${b.id})`);
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
}

main().catch((e) => {
  console.error("Inspect failed:", e.message);
  process.exit(1);
});
