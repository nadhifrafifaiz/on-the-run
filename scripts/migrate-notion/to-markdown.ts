// Minimal Notion blocks → markdown converter for the race report page.
// Supports: paragraphs, headings 1-3, bulleted/numbered lists, quotes,
// dividers, code blocks, tables. Nested blocks are recursed one level.

import { notion, richText } from "./notion";

type Block = { id: string; type: string; has_children?: boolean; [key: string]: unknown };

async function blockToMd(b: Block, depth: number): Promise<string> {
  const t = b.type;
  const content = (b[t] ?? {}) as { rich_text?: unknown };
  const text = richText(content.rich_text);
  const pad = "  ".repeat(depth);
  switch (t) {
    case "paragraph":
      return text ? `${pad}${text}` : "";
    case "heading_1":
      return `# ${text}`;
    case "heading_2":
      return `## ${text}`;
    case "heading_3":
      return `### ${text}`;
    case "bulleted_list_item":
      return `${pad}- ${text}`;
    case "numbered_list_item":
      return `${pad}1. ${text}`;
    case "quote":
      return `${pad}> ${text}`;
    case "to_do": {
      const checked = (content as { checked?: boolean }).checked ? "[x]" : "[ ]";
      return `${pad}- ${checked} ${text}`;
    }
    case "divider":
      return `${pad}---`;
    case "code": {
      const lang = (content as { language?: string }).language ?? "";
      return `${pad}\`\`\`${lang}\n${text}\n${pad}\`\`\``;
    }
    case "callout":
      return `${pad}> **Note:** ${text}`;
    case "table": {
      return await tableToMd(b.id, depth);
    }
    default:
      return text ? `${pad}${text}` : "";
  }
}

async function tableToMd(tableId: string, depth: number): Promise<string> {
  const pad = "  ".repeat(depth);
  const rows: string[][] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: tableId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const r of res.results) {
      const b = r as { type: string; table_row?: { cells: Array<Array<{ plain_text: string }>> } };
      if (b.type !== "table_row" || !b.table_row) continue;
      rows.push(b.table_row.cells.map((c) => c.map((x) => x.plain_text).join("").trim()));
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  if (rows.length === 0) return "";
  const header = rows[0];
  const body = rows.slice(1);
  const sep = header.map(() => "---");
  const fmtRow = (r: string[]) => `${pad}| ${r.join(" | ")} |`;
  return [fmtRow(header), fmtRow(sep), ...body.map(fmtRow)].join("\n");
}

export async function pageToMarkdown(pageId: string): Promise<string> {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const r of res.results) {
      const b = r as Block;
      const md = await blockToMd(b, 0);
      if (md) out.push(md);
      // Recurse into direct children (one level) for lists/toggles.
      if (b.has_children && ["bulleted_list_item", "numbered_list_item", "toggle"].includes(b.type)) {
        const kids = await notion.blocks.children.list({ block_id: b.id, page_size: 100 });
        for (const k of kids.results) {
          const kb = k as Block;
          const kmd = await blockToMd(kb, 1);
          if (kmd) out.push(kmd);
        }
      }
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out.join("\n\n").trim() + "\n";
}
