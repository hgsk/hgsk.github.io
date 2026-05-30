import { defineConfig } from "astro/config";
import { rehypeAutoLink } from "./src/plugins/rehype-auto-link";
import { rehypeTableWrap } from "./src/plugins/rehype-table-wrap";

export default defineConfig({
  site: "https://hgsk.github.io",
  markdown: {
    rehypePlugins: [rehypeAutoLink, rehypeTableWrap],
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark"
      }
    }
  }
});
