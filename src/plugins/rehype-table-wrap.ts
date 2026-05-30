import { visit } from "unist-util-visit";

/**
 * Wraps <table> elements in a scrollable <div class="table-wrap">
 */
export function rehypeTableWrap() {
  return (tree: any) => {
    visit(tree, "element", (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== "table" || typeof index !== "number" || !parent) return;
      // すでにラップ済みならスキップ
      if (parent.tagName === "div" && parent.properties?.className?.includes("table-wrap")) return;

      const wrapper = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"] },
        children: [node],
      };
      parent.children.splice(index, 1, wrapper);
    });
  };
}
