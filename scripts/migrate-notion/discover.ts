/**
 * Discovery script: walks the shared Notion homepage tree and inventories
 * every reachable page and database. Uses the 2025-09 data_sources API so
 * databases with multiple sources report properly.
 *
 * Usage: npm run notion:discover
 */
import { notion, getDefaultDataSourceId, pageTitle } from "./notion";
import { isFullPage } from "@notionhq/client";

const rootId = process.env.NOTION_HOMEPAGE_ID;
if (!rootId) throw new Error("NOTION_HOMEPAGE_ID not set");

type Node = { kind: "page" | "database"; id: string; title: string; depth: number; extra?: string };

async function walk(pageId: string, depth: number, out: Node[], seen: Set<string>, maxDepth = 3) {
  if (depth > maxDepth || seen.has(pageId)) return;
  seen.add(pageId);
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of res.results) {
      const b = block as {
        type: string;
        id: string;
        child_page?: { title: string };
        child_database?: { title: string };
      };
      if (b.type === "child_page" && b.child_page) {
        out.push({ kind: "page", id: b.id, title: b.child_page.title || "(untitled)", depth });
        await walk(b.id, depth + 1, out, seen, maxDepth);
      } else if (b.type === "child_database" && b.child_database) {
        out.push({
          kind: "database",
          id: b.id,
          title: b.child_database.title || "(untitled)",
          depth,
        });
        try {
          const dsId = await getDefaultDataSourceId(b.id);
          const ds = await notion.dataSources.retrieve({ data_source_id: dsId });
          const props = Object.entries(ds.properties)
            .map(([n, p]) => `${n}:${(p as { type: string }).type}`)
            .join(", ");
          out.push({
            kind: "database",
            id: dsId,
            title: `  data_source ${dsId}`,
            depth: depth + 1,
            extra: "dsid",
          });
          out.push({
            kind: "database",
            id: dsId,
            title: `  props: ${props}`,
            depth: depth + 1,
            extra: "props",
          });
          let count = 0;
          let cur: string | undefined;
          do {
            const q = await notion.dataSources.query({
              data_source_id: dsId,
              page_size: 100,
              start_cursor: cur,
            });
            count += q.results.length;
            cur = q.has_more ? q.next_cursor ?? undefined : undefined;
          } while (cur);
          out.push({
            kind: "database",
            id: dsId,
            title: `  rows: ${count}`,
            depth: depth + 1,
            extra: "rows",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          out.push({
            kind: "database",
            id: b.id,
            title: `  (could not read: ${msg})`,
            depth: depth + 1,
            extra: "err",
          });
        }
      }
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
}

async function main() {
  console.log(`Walking homepage tree (root: ${rootId})…\n`);
  const rootPage = await notion.pages.retrieve({ page_id: rootId! });
  if (isFullPage(rootPage)) console.log(`Root: ${pageTitle(rootPage)}\n`);
  const nodes: Node[] = [];
  await walk(rootId!, 0, nodes, new Set(), 3);
  console.log("Discovered:\n");
  for (const n of nodes) {
    const indent = "  ".repeat(n.depth);
    const marker = n.extra ? "" : n.kind === "database" ? "📊" : "📄";
    if (n.extra) console.log(`${indent}${n.title}`);
    else console.log(`${indent}${marker} ${n.title}  (${n.id})`);
  }
  const pages = nodes.filter((n) => n.kind === "page").length;
  const dbs = nodes.filter((n) => n.kind === "database" && !n.extra).length;
  console.log(`\nTotal: ${pages} page(s), ${dbs} database(s).`);
}

main().catch((e) => {
  console.error("Discovery failed:", e.message);
  if (e.code === "unauthorized") {
    console.error("→ Check integration access (Notion page → ⋯ → Connections).");
  }
  process.exit(1);
});
