import { defineConfig } from "astro/config";
import { rehypeAutoLink } from "./src/plugins/rehype-auto-link";

export default defineConfig({
  site: "https://hgsk.github.io",
  markdown: {
    rehypePlugins: [rehypeAutoLink]
  }
});
