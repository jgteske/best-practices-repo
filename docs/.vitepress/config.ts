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
      { text: "JavaScript & Node", link: "/javascript/" },
      { text: "Linux", link: "/linux/" },
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
            { text: "Advanced Chaining: Callbacks & Timing", link: "/react/advanced-hook-chaining" },
            { text: "Queues & Concurrency", link: "/react/queues-and-concurrency" },
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
      "/javascript/": [
        {
          text: "JavaScript & Node.js",
          items: [{ text: "Overview", link: "/javascript/" }],
        },
        {
          text: "The Language",
          items: [
            { text: "Values, Types & Coercion", link: "/javascript/values-and-coercion" },
            { text: "Scope, Closures & this", link: "/javascript/scope-and-closures" },
            { text: "Objects, Prototypes & Classes", link: "/javascript/objects-and-classes" },
            { text: "Arrays, Iteration & Collections", link: "/javascript/arrays-and-iteration" },
          ],
        },
        {
          text: "Modules & Async",
          items: [
            { text: "ESM vs CommonJS", link: "/javascript/modules-esm-and-cjs" },
            { text: "The Event Loop & Promises", link: "/javascript/event-loop-and-async" },
            { text: "Promise Queues & Concurrency Limits", link: "/javascript/promise-queues" },
            { text: "Timers, Rate Limits & Scheduling", link: "/javascript/timers-and-scheduling" },
          ],
        },
        {
          text: "The Node Runtime",
          items: [
            { text: "Running Node", link: "/javascript/running-node" },
            { text: "npm, package.json & Semver", link: "/javascript/npm-and-packages" },
            { text: "Node Core APIs", link: "/javascript/core-apis" },
            { text: "Streams & Buffers", link: "/javascript/streams-and-buffers" },
            { text: "HTTP & Networking", link: "/javascript/http-and-networking" },
            { text: "Errors & Graceful Shutdown", link: "/javascript/errors-and-shutdown" },
            { text: "Testing with node:test", link: "/javascript/testing-with-node-test" },
          ],
        },
        {
          text: "Reference",
          items: [{ text: "JavaScript & Node Cheat Sheet", link: "/javascript/cheatsheet" }],
        },
      ],
      "/linux/": [
        {
          text: "Linux, Bash & the Terminal",
          items: [{ text: "Overview", link: "/linux/" }],
        },
        {
          text: "Using the Shell",
          items: [
            { text: "Shell Basics & Navigation", link: "/linux/shell-basics" },
            { text: "Files & Directories", link: "/linux/files-and-directories" },
            { text: "Pipes, Redirection & Streams", link: "/linux/pipes-and-redirection" },
            { text: "Text Processing", link: "/linux/text-processing" },
          ],
        },
        {
          text: "The System",
          items: [
            { text: "Permissions & Ownership", link: "/linux/permissions-and-ownership" },
            { text: "Processes, Jobs & Signals", link: "/linux/processes-and-jobs" },
            { text: "System, Packages & Services", link: "/linux/system-and-packages" },
            { text: "Networking & Remote Work", link: "/linux/networking-and-remote" },
          ],
        },
        {
          text: "Scripting",
          items: [
            { text: "Bash Scripting Basics", link: "/linux/scripting-basics" },
            { text: "Writing Robust Scripts", link: "/linux/scripting-robustness" },
          ],
        },
        {
          text: "Reference",
          items: [{ text: "Command Cheat Sheet", link: "/linux/cheatsheet" }],
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
