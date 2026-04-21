import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import kuromoji from "kuromoji";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const BLOG_DIR = path.join(ROOT, "src/content/blog");
const KEYWORD_DIR = path.join(ROOT, "src/content/keywords");
const GENERATED_DIR = path.join(ROOT, "src/generated");
const CACHE_DIR = path.join(ROOT, ".cache/autolink");
const LINK_MAP_PATH = path.join(GENERATED_DIR, "link-map.json");
const BACKLINK_MAP_PATH = path.join(GENERATED_DIR, "backlink-map.json");
const CACHE_PATH = path.join(CACHE_DIR, "analysis-cache.json");

type KeywordStatus = "published" | "draft";
type Category = "it" | "economy" | "science" | "culture" | "cooking" | "general";

interface PostEntry {
  slug: string;
  title: string;
  body: string;
  hash: string;
}

interface KeywordEntry {
  term: string;
  description: string;
  body: string;
  status: KeywordStatus;
  hash: string;
}

interface CachePost {
  hash: string;
  category: Category;
  minedTerms: string[];
}

interface CacheKeyword {
  hash: string;
  category: Category;
}

interface CacheData {
  posts: Record<string, CachePost>;
  keywords: Record<string, CacheKeyword>;
}

interface LinkEntry {
  keyword: string;
  encodedKeyword: string;
  url: string;
  status: KeywordStatus;
}

const CATEGORY_PROTOTYPES: Record<Category, string> = {
  it: "プログラミング ソフトウェア Web 開発 技術 システム アルゴリズム",
  economy: "経済 金融 投資 株式 企業 市場 マクロ",
  science: "科学 研究 実験 物理 化学 生物 数学",
  culture: "文化 歴史 芸術 文学 社会 言語",
  cooking: "料理 レシピ 食材 調理 味 キッチン",
  general: "一般 用語 概念 説明"
};

class LocalAiEngine {
  private ready = false;
  private failed = false;
  private extractor: any = null;
  private categoryVectors = new Map<Category, number[]>();

  private async init() {
    if (this.ready || this.failed) {
      return;
    }
    try {
      const { env, pipeline } = await import("@xenova/transformers");
      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      this.extractor = await pipeline("feature-extraction", "intfloat/multilingual-e5-small");
      for (const [category, text] of Object.entries(CATEGORY_PROTOTYPES) as Array<[Category, string]>) {
        this.categoryVectors.set(category, await this.embed(text));
      }
      this.ready = true;
      console.log("[pre-build] Local AI model initialized.");
    } catch (error) {
      this.failed = true;
      console.warn("[pre-build] Local AI unavailable. Falling back to heuristic mode.", error);
    }
  }

  private static cosine(a: number[], b: number[]) {
    let dot = 0;
    let aa = 0;
    let bb = 0;
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      dot += a[i] * b[i];
      aa += a[i] * a[i];
      bb += b[i] * b[i];
    }
    if (aa === 0 || bb === 0) {
      return 0;
    }
    return dot / (Math.sqrt(aa) * Math.sqrt(bb));
  }

  private async embed(input: string): Promise<number[]> {
    const normalized = `query: ${input.replace(/\s+/g, " ").trim()}`;
    const output = await this.extractor(normalized, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  }

  async categorize(input: string): Promise<Category> {
    await this.init();
    if (!this.ready) {
      return "general";
    }
    const vector = await this.embed(input);
    let best: Category = "general";
    let bestScore = -1;
    for (const [category, prototype] of this.categoryVectors.entries()) {
      const score = LocalAiEngine.cosine(vector, prototype);
      if (score > bestScore) {
        best = category;
        bestScore = score;
      }
    }
    return best;
  }

  async similarity(a: string, b: string): Promise<number> {
    await this.init();
    if (!this.ready) {
      const aa = a.toLowerCase();
      const bb = b.toLowerCase();
      return aa.includes(bb) || bb.includes(aa) ? 0.95 : 0.6;
    }
    const [va, vb] = await Promise.all([this.embed(a), this.embed(b)]);
    return LocalAiEngine.cosine(va, vb);
  }
}

const ai = new LocalAiEngine();

const md5 = (input: string) => createHash("md5").update(input).digest("hex");

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readCache(): Promise<CacheData> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    return JSON.parse(raw) as CacheData;
  } catch {
    return { posts: {}, keywords: {} };
  }
}

async function writeCache(cache: CacheData) {
  await ensureDir(CACHE_DIR);
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

async function listMarkdownFiles(dirPath: string) {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter((file) => file.endsWith(".md")).map((file) => path.join(dirPath, file));
  } catch {
    return [];
  }
}

async function readPosts(): Promise<PostEntry[]> {
  const files = await listMarkdownFiles(BLOG_DIR);
  const posts = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = matter(raw);
      const fileName = path.basename(filePath, ".md");
      return {
        slug: fileName,
        title: String(parsed.data.title ?? fileName),
        body: String(parsed.content ?? ""),
        hash: md5(raw)
      };
    })
  );
  return posts;
}

async function readKeywords(): Promise<KeywordEntry[]> {
  const files = await listMarkdownFiles(KEYWORD_DIR);
  const keywords = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = matter(raw);
      const fileName = path.basename(filePath, ".md");
      return {
        term: String(parsed.data.title ?? fileName),
        description: String(parsed.data.description ?? ""),
        body: String(parsed.content ?? ""),
        status: parsed.data.status === "published" ? "published" : "draft",
        hash: md5(raw)
      } as KeywordEntry;
    })
  );
  return keywords;
}

async function buildTokenizer() {
  return new Promise<any>((resolve, reject) => {
    kuromoji.builder({ dicPath: path.join(ROOT, "node_modules/kuromoji/dict") }).build((error, tokenizer) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(tokenizer);
    });
  });
}

function normalizeTerm(term: string) {
  return term.trim().replace(/\s+/g, " ");
}

function sanitizeFileName(term: string) {
  return term.replace(/[\\/:*?"<>|]/g, "_");
}

async function mineTermsByPost(posts: PostEntry[], cache: CacheData) {
  const tokenizer = await buildTokenizer();
  const minedByPost: Record<string, string[]> = {};

  for (const post of posts) {
    const cached = cache.posts[post.slug];
    if (cached && cached.hash === post.hash) {
      minedByPost[post.slug] = cached.minedTerms;
      continue;
    }

    const tokens = tokenizer.tokenize(post.body) as Array<{ surface_form: string; pos: string }>;
    const terms = new Set<string>();
    for (const token of tokens) {
      if (token.pos !== "名詞") {
        continue;
      }
      const normalized = normalizeTerm(token.surface_form);
      if (normalized.length < 2) {
        continue;
      }
      if (/^[\d\W_]+$/u.test(normalized)) {
        continue;
      }
      terms.add(normalized);
    }
    minedByPost[post.slug] = Array.from(terms);
  }

  return minedByPost;
}

function buildCoOccurrence(minedByPost: Record<string, string[]>) {
  const postsByTerm = new Map<string, Set<string>>();
  for (const [slug, terms] of Object.entries(minedByPost)) {
    for (const term of terms) {
      if (!postsByTerm.has(term)) {
        postsByTerm.set(term, new Set());
      }
      postsByTerm.get(term)?.add(slug);
    }
  }
  return postsByTerm;
}

async function ensureDraftKeywordFiles(terms: string[]) {
  await ensureDir(KEYWORD_DIR);
  for (const term of terms) {
    const filePath = path.join(KEYWORD_DIR, `${sanitizeFileName(term)}.md`);
    try {
      await fs.access(filePath);
      continue;
    } catch {
      const content = `---\ntitle: "${term}"\ndescription: "Auto-generated WIP keyword page"\nstatus: "draft"\n---\n\nこのページは自動生成された下書きです。\n`;
      await fs.writeFile(filePath, content, "utf-8");
      console.log(`[pre-build] Created draft keyword page: ${filePath}`);
    }
  }
}

function loadAhoCorasick() {
  return require("aho-corasick");
}

function findOccurrences(text: string, terms: string[]) {
  const AhoCorasick = loadAhoCorasick();
  const engine = new AhoCorasick();
  for (const term of terms) {
    engine.add(term, term);
  }
  engine.build_fail();
  const occurrences: Array<{ term: string; start: number; context: string }> = [];
  engine.search(text, (term: string, _data: unknown, start: number) => {
    const from = Math.max(0, start - 24);
    const to = Math.min(text.length, start + term.length + 24);
    const context = text.slice(from, to);
    occurrences.push({ term, start, context });
  });
  occurrences.sort((a, b) => a.start - b.start || b.term.length - a.term.length);
  return occurrences;
}

function isCategoryCompatible(postCategory: Category, keywordCategory: Category) {
  if (postCategory === "general" || keywordCategory === "general") {
    return true;
  }
  return postCategory === keywordCategory;
}

async function main() {
  await ensureDir(GENERATED_DIR);
  await ensureDir(KEYWORD_DIR);

  const cache = await readCache();
  const posts = await readPosts();
  let keywords = await readKeywords();

  const minedByPost = await mineTermsByPost(posts, cache);
  const coOccurrence = buildCoOccurrence(minedByPost);
  const promotedTerms = Array.from(coOccurrence.entries())
    .filter(([, slugs]) => slugs.size >= 2)
    .map(([term]) => term);

  const existingTerms = new Set(keywords.map((keyword) => keyword.term));
  const newDraftTerms = promotedTerms.filter((term) => !existingTerms.has(term));
  await ensureDraftKeywordFiles(newDraftTerms);
  keywords = await readKeywords();

  const postCategories = new Map<string, Category>();
  const keywordCategories = new Map<string, Category>();

  for (const post of posts) {
    const cached = cache.posts[post.slug];
    if (cached && cached.hash === post.hash) {
      postCategories.set(post.slug, cached.category);
      continue;
    }
    const category = await ai.categorize(`${post.title}\n${post.body}`);
    postCategories.set(post.slug, category);
    cache.posts[post.slug] = {
      hash: post.hash,
      category,
      minedTerms: minedByPost[post.slug] ?? []
    };
  }

  for (const keyword of keywords) {
    const cached = cache.keywords[keyword.term];
    if (cached && cached.hash === keyword.hash) {
      keywordCategories.set(keyword.term, cached.category);
      continue;
    }
    const category = await ai.categorize(`${keyword.term}\n${keyword.description}\n${keyword.body}`);
    keywordCategories.set(keyword.term, category);
    cache.keywords[keyword.term] = { hash: keyword.hash, category };
  }

  const terms = Array.from(new Set(keywords.map((keyword) => keyword.term))).sort(
    (a, b) => b.length - a.length || a.localeCompare(b)
  );
  const keywordByTerm = new Map(keywords.map((keyword) => [keyword.term, keyword]));

  const linkMap: Record<string, LinkEntry[]> = {};
  const backlinkMap: Record<string, Array<{ slug: string; title: string; url: string }>> = {};

  for (const post of posts) {
    const occurrences = findOccurrences(post.body, terms);
    const accepted = new Map<string, LinkEntry>();

    for (const occurrence of occurrences) {
      if (accepted.has(occurrence.term)) {
        continue;
      }
      const keyword = keywordByTerm.get(occurrence.term);
      if (!keyword) {
        continue;
      }

      const postCategory = postCategories.get(post.slug) ?? "general";
      const keywordCategory = keywordCategories.get(keyword.term) ?? "general";
      if (!isCategoryCompatible(postCategory, keywordCategory)) {
        continue;
      }

      const definition = `${keyword.term}\n${keyword.description}\n${keyword.body}`;
      const score = await ai.similarity(occurrence.context, definition);
      if (score < 0.85) {
        continue;
      }

      accepted.set(keyword.term, {
        keyword: keyword.term,
        encodedKeyword: encodeURIComponent(keyword.term),
        url: `/keywords/${encodeURIComponent(keyword.term)}/`,
        status: keyword.status
      });
    }

    linkMap[post.slug] = Array.from(accepted.values()).sort(
      (a, b) => b.keyword.length - a.keyword.length || a.keyword.localeCompare(b.keyword)
    );
    for (const link of linkMap[post.slug]) {
      if (!backlinkMap[link.keyword]) {
        backlinkMap[link.keyword] = [];
      }
      backlinkMap[link.keyword].push({
        slug: post.slug,
        title: post.title,
        url: `/posts/${post.slug}/`
      });
    }
  }

  for (const [term, links] of Object.entries(backlinkMap)) {
    backlinkMap[term] = links.sort((a, b) => a.title.localeCompare(b.title));
  }

  await fs.writeFile(
    LINK_MAP_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        entries: linkMap
      },
      null,
      2
    ),
    "utf-8"
  );
  await fs.writeFile(
    BACKLINK_MAP_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        entries: backlinkMap
      },
      null,
      2
    ),
    "utf-8"
  );

  await writeCache(cache);
  console.log("[pre-build] link-map/backlink-map generated.");
}

await main();
