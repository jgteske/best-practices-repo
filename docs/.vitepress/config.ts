import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(defineConfig({
  title: "Best Practices Repo",
  description: "A general documentation site, built from Markdown, with an in-depth TypeScript best practices guide.",
  lastUpdated: true,
  cleanUrls: true,

  // Served from https://jgteske.github.io/best-practices-repo/ on GitHub Pages,
  // so every asset/link must be prefixed with the repo name. Override with the
  // DOCS_BASE env var (e.g. "/" ) if you deploy to a custom domain or user site.
  base: process.env.DOCS_BASE ?? "/best-practices-repo/",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "TypeScript", link: "/typescript/" },
      { text: "React", link: "/react/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "About this repository", link: "/guide/" },
            { text: "Writing new docs", link: "/guide/writing-docs" },
          ],
        },
      ],
      "/typescript/": [
        {
          text: "TypeScript Best Practices",
          items: [{ text: "Overview", link: "/typescript/" }],
        },
        {
          text: "Modeling & Types",
          items: [
            { text: "Make Illegal States Unrepresentable", link: "/typescript/modeling-with-unions" },
            { text: "Derive Types with typeof", link: "/typescript/derive-types-with-typeof" },
            { text: "Const Assertions & Enum Alternatives", link: "/typescript/const-assertions-and-enums" },
            { text: "Template Literal Types", link: "/typescript/template-literal-types" },
          ],
        },
        {
          text: "Type-Level Programming",
          items: [
            { text: "Generics In-Depth", link: "/typescript/generics-in-depth" },
            { text: "Mapped & Conditional Types", link: "/typescript/mapped-and-conditional-types" },
            { text: "Function Signatures & Overloads", link: "/typescript/function-signatures" },
          ],
        },
        {
          text: "Safety & Correctness",
          items: [
            { text: "Exhaustive Checks with never", link: "/typescript/exhaustive-checks-with-never" },
            { text: "Type-Safe Validation", link: "/typescript/type-safe-validation" },
            { text: "Error Handling & Result Types", link: "/typescript/error-handling" },
          ],
        },
        {
          text: "Runtime Patterns",
          items: [
            { text: "Event Listeners with Classes", link: "/typescript/event-listeners-with-classes" },
            { text: "Async & Promise Patterns", link: "/typescript/async-and-promises" },
            { text: "Cancellation & AbortSignal", link: "/typescript/cancellation-and-signals" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "General Best Practices", link: "/typescript/general-best-practices" },
          ],
        },
      ],
      "/react/": [
        {
          text: "React Best Practices",
          items: [{ text: "Overview", link: "/react/" }],
        },
        {
          text: "Structure & Declarations",
          items: [
            { text: "Component Declarations", link: "/react/component-declarations" },
            { text: "Props & Passing Parameters", link: "/react/props-and-parameters" },
          ],
        },
        {
          text: "Sharing State",
          items: [
            { text: "Context: State & APIs", link: "/react/context" },
            { text: "When Elements & APIs Are Ready", link: "/react/refs-and-availability" },
          ],
        },
        {
          text: "Hooks",
          items: [
            { text: "Custom Hooks & Hook Chaining", link: "/react/custom-hooks-and-chaining" },
            { text: "When to useEffect / useCallback / useMemo", link: "/react/hooks-when-to-use" },
            { text: "State & Effects", link: "/react/state-and-effects" },
          ],
        },
        {
          text: "Rendering",
          items: [
            { text: "Rendering & Component Lifecycle", link: "/react/rendering-and-lifecycle" },
          ],
        },
        {
          text: "Events",
          items: [
            { text: "Event Handlers & Function Chaining", link: "/react/event-handlers" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "General Best Practices", link: "/react/general-best-practices" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/jgteske/best-practices-repo" }],

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/jgteske/best-practices-repo/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: {
      level: [2, 3],
    },
  },

  markdown: {
    lineNumbers: true,
  },
}));
