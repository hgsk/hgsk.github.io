import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";

interface LinkEntry {
  keyword: string;
  url: string;
  status: "published" | "draft";
}

interface LinkMapFile {
  entries: Record<string, LinkEntry[]>;
}

interface VFileLike {
  path?: string;
  history?: string[];
}

type TextNode = { type: "text"; value: string };
type ElementNode = {
  type: "element";
  tagName: "a";
  properties: {
    href: string;
    className: string[];
    title?: string;
    "aria-label"?: string;
  };
  children: TextNode[];
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LINK_MAP_PATH = path.join(ROOT, "src/generated/link-map.json");

let cachedMap: LinkMapFile | null = null;

function readLinkMap() {
  if (cachedMap) {
    return cachedMap;
  }
  try {
    const raw = readFileSync(LINK_MAP_PATH, "utf-8");
    cachedMap = JSON.parse(raw) as LinkMapFile;
  } catch {
    cachedMap = { entries: {} };
  }
  return cachedMap;
}

function extractSlug(vfile: VFileLike) {
  const candidate = String(vfile.path ?? vfile.history?.[0] ?? "");
  const normalized = candidate.replace(/\\/g, "/");
  const match = normalized.match(/\/src\/content\/blog\/(.+)\.md$/);
  return match?.[1] ?? "";
}

function splitWithTerms(input: string, terms: LinkEntry[], used: Set<string>) {
  if (!terms.length || !input.trim()) {
    return [{ type: "text", value: input } satisfies TextNode];
  }

  const sorted = [...terms].sort((a, b) => b.keyword.length - a.keyword.length || a.keyword.localeCompare(b.keyword));
  const parts: Array<TextNode | ElementNode> = [];
  let cursor = 0;
  let chunkStart = 0;

  while (cursor < input.length) {
    let longestMatch: LinkEntry | null = null;
    for (const term of sorted) {
      if (input.startsWith(term.keyword, cursor)) {
        longestMatch = term;
        break;
      }
    }

    if (!longestMatch) {
      cursor += 1;
      continue;
    }

    if (chunkStart < cursor) {
      parts.push({ type: "text", value: input.slice(chunkStart, cursor) });
    }

    if (used.has(longestMatch.keyword)) {
      parts.push({ type: "text", value: longestMatch.keyword });
    } else {
      parts.push({
        type: "element",
        tagName: "a",
        properties: {
          href: longestMatch.url,
          className: longestMatch.status === "draft" ? ["keyword-link", "is-draft"] : ["keyword-link"],
          title: longestMatch.status === "draft" ? "WIP: 作成中のキーワードページです" : undefined,
          "aria-label":
            longestMatch.status === "draft"
              ? `${longestMatch.keyword} (WIP keyword page, under construction)`
              : undefined
        },
        children: [{ type: "text", value: longestMatch.keyword }]
      });
      used.add(longestMatch.keyword);
    }

    cursor += longestMatch.keyword.length;
    chunkStart = cursor;
  }

  if (chunkStart < input.length) {
    parts.push({ type: "text", value: input.slice(chunkStart) });
  }

  return parts;
}

const BLOCKED_PARENTS = new Set(["a", "code", "pre", "script", "style"]);

export function rehypeAutoLink() {
  return (tree: any, vfile: VFileLike) => {
    const linkMap = readLinkMap();
    const slug = extractSlug(vfile);
    const terms = linkMap.entries[slug] ?? [];
    if (!terms.length) {
      return;
    }

    const used = new Set<string>();
    visit(tree, "text", (node: any, index: number | undefined, parent: any) => {
      if (typeof index !== "number" || !parent || BLOCKED_PARENTS.has(parent.tagName)) {
        return;
      }
      const replacements = splitWithTerms(String(node.value ?? ""), terms, used);
      if (replacements.length === 1 && replacements[0].type === "text") {
        return;
      }
      parent.children.splice(index, 1, ...replacements);
      return index + replacements.length;
    });
  };
}
