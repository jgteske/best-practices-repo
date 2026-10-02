import { defineConfig, type DefaultTheme } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// JavaScript, TypeScript and React share one sidebar, grouped by topic rather
// than by language: each group puts the JS, TS and React pages on that topic
// side by side. The pages keep their /javascript/, /typescript/ and /react/ URLs.
const jsTsSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "JavaScript & TypeScript",
    items: [
      { text: "JavaScript & Node Overview", link: "/javascript/" },
      { text: "TypeScript Overview", link: "/typescript/" },
      { text: "React Overview", link: "/react/" },
    ],
  },
  {
    text: "Language Fundamentals",
    items: [
      { text: "Values, Types & Coercion", link: "/javascript/values-and-coercion" },
      { text: "Scope, Closures & this", link: "/javascript/scope-and-closures" },
      { text: "Functions, Arrows & Composition", link: "/javascript/functions-and-composition" },
      { text: "Arrays, Iteration & Collections", link: "/javascript/arrays-and-iteration" },
    ],
  },
  {
    text: "Modeling with Types",
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
    text: "Objects & Classes",
    items: [
      { text: "Objects, Prototypes & Classes", link: "/javascript/objects-and-classes" },
      { text: "Classes at Runtime", link: "/javascript/classes-at-runtime" },
      { text: "Classes, Fields & Constructors", link: "/typescript/classes-and-constructors" },
      { text: "Methods, this & Callers", link: "/typescript/class-methods-and-callers" },
      { text: "Abstract Classes & Inheritance", link: "/typescript/abstract-classes-and-inheritance" },
      { text: "Classes with Interfaces & Types", link: "/typescript/classes-with-interfaces" },
      { text: "Chaining & Fluent Builders", link: "/typescript/class-chaining-and-builders" },
      { text: "Mixins & Class Factories", link: "/typescript/mixins-and-class-factories" },
    ],
  },
  {
    text: "Design Patterns",
    items: [
      { text: "Factory Functions", link: "/typescript/factory-functions" },
      { text: "Design Patterns in TypeScript", link: "/typescript/design-patterns" },
    ],
  },
  {
    text: "Correctness & Validation",
    items: [
      { text: "Exhaustive Checks with never", link: "/typescript/exhaustive-checks-with-never" },
      { text: "Type-Safe Validation", link: "/typescript/type-safe-validation" },
      { text: "Schema Validation with zod", link: "/typescript/schema-validation" },
    ],
  },
  {
    text: "Error Handling",
    items: [
      { text: "Error Handling & Result Types", link: "/typescript/error-handling" },
      { text: "Errors & Graceful Shutdown (Node)", link: "/javascript/errors-and-shutdown" },
      { text: "Error Boundaries (React)", link: "/react/error-handling" },
    ],
  },
  {
    text: "Async, Events & Concurrency",
    items: [
      { text: "The Event Loop & Promises", link: "/javascript/event-loop-and-async" },
      { text: "Async & Promise Patterns", link: "/typescript/async-and-promises" },
      { text: "Promise Queues & Concurrency Limits", link: "/javascript/promise-queues" },
      { text: "Timers, Rate Limits & Scheduling", link: "/javascript/timers-and-scheduling" },
      { text: "Cancellation & AbortSignal", link: "/typescript/cancellation-and-signals" },
      { text: "Event Listeners with Classes", link: "/typescript/event-listeners-with-classes" },
    ],
  },
  {
    text: "Modules & Declarations",
    items: [
      { text: "ESM vs CommonJS", link: "/javascript/modules-esm-and-cjs" },
      { text: ".ts, .tsx & .d.ts", link: "/typescript/file-kinds-and-declarations" },
      { text: "Namespaces & Declaration Merging", link: "/typescript/namespaces" },
      { text: "tsconfig & Strictness Flags", link: "/typescript/tsconfig-and-strictness" },
    ],
  },
  {
    text: "Packages & Dependencies",
    items: [
      { text: "npm, package.json & Semver", link: "/javascript/npm-and-packages" },
      { text: "Creating & Publishing a Package", link: "/javascript/creating-packages" },
      { text: "Version Ranges In Depth", link: "/javascript/version-ranges" },
      { text: "How Dependencies Get Resolved", link: "/javascript/dependency-resolution" },
    ],
  },
  {
    text: "The Node Runtime",
    items: [
      { text: "Running Node", link: "/javascript/running-node" },
      { text: "Node Core APIs", link: "/javascript/core-apis" },
      { text: "Streams & Buffers", link: "/javascript/streams-and-buffers" },
      { text: "HTTP & Networking", link: "/javascript/http-and-networking" },
      { text: "Testing with node:test", link: "/javascript/testing-with-node-test" },
    ],
  },
  {
    text: "React: Components & Props",
    items: [
      { text: "Component Declarations", link: "/react/component-declarations" },
      { text: "Props & Passing Parameters", link: "/react/props-and-parameters" },
    ],
  },
  {
    text: "React: State, Context & Refs",
    items: [
      { text: "State & Effects", link: "/react/state-and-effects" },
      { text: "State with Reducers", link: "/react/state-with-reducers" },
      { text: "Data Fetching", link: "/react/data-fetching" },
      { text: "Context: State & APIs", link: "/react/context" },
      { text: "When Elements & APIs Are Ready", link: "/react/refs-and-availability" },
    ],
  },
  {
    text: "React: Hooks",
    items: [
      { text: "When to useEffect / useCallback / useMemo", link: "/react/hooks-when-to-use" },
      { text: "Custom Hooks & Hook Chaining", link: "/react/custom-hooks-and-chaining" },
      { text: "Advanced Chaining: Callbacks & Timing", link: "/react/advanced-hook-chaining" },
      { text: "Queues & Concurrency", link: "/react/queues-and-concurrency" },
    ],
  },
  {
    text: "React: Rendering & Events",
    items: [
      { text: "Rendering & Component Lifecycle", link: "/react/rendering-and-lifecycle" },
      { text: "Event Handlers & Function Chaining", link: "/react/event-handlers" },
    ],
  },
  {
    text: "React: Forms & Testing",
    items: [
      { text: "Forms", link: "/react/forms" },
      { text: "Testing Components", link: "/react/testing-components" },
    ],
  },
  {
    text: "Reference",
    items: [
      { text: "JavaScript & Node Cheat Sheet", link: "/javascript/cheatsheet" },
      { text: "TypeScript General Best Practices", link: "/typescript/general-best-practices" },
      { text: "React General Best Practices", link: "/react/general-best-practices" },
    ],
  },
];

export default withMermaid(defineConfig({
  title: "Best Practices Repo",
  description: "A general documentation site, built from Markdown, with in-depth TypeScript, React, JavaScript, Python, Linux and Git guides.",
  lastUpdated: true,
  cleanUrls: true,

  // Served from https://jgteske.github.io/best-practices-repo/ on GitHub Pages,
  // so every asset/link must be prefixed with the repo name. Override with the
  // DOCS_BASE env var (e.g. "/" ) if you deploy to a custom domain or user site.
  base: process.env.DOCS_BASE ?? "/best-practices-repo/",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
      {
        text: "JavaScript & TypeScript",
        items: [
          { text: "JavaScript & Node", link: "/javascript/" },
          { text: "TypeScript", link: "/typescript/" },
          { text: "React", link: "/react/" },
        ],
      },
      { text: "Python", link: "/python/" },
      { text: "Linux", link: "/linux/" },
      { text: "Git", link: "/git/" },
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
      "/javascript/": jsTsSidebar,
      "/typescript/": jsTsSidebar,
      "/react/": jsTsSidebar,
      "/python/": [
        {
          text: "Python",
          items: [{ text: "Overview", link: "/python/" }],
        },
        {
          text: "The Language",
          items: [
            { text: "Python Basics", link: "/python/basics" },
            { text: "Function Typing", link: "/python/function-typing" },
            { text: "Classes & Dataclasses", link: "/python/classes" },
            { text: "Errors & Context Managers", link: "/python/errors-and-context-managers" },
            { text: "Iterators & Generators", link: "/python/iterators-and-generators" },
          ],
        },
        {
          text: "Projects & Environments",
          items: [
            { text: "Poetry & Virtual Environments", link: "/python/poetry-and-virtualenvs" },
            { text: "Managing Dependencies", link: "/python/dependencies" },
            { text: "Modules & Imports", link: "/python/modules-and-imports" },
            { text: "Namespace Packages & Imports", link: "/python/namespace-packages" },
          ],
        },
        {
          text: "Packaging & Distribution",
          items: [
            { text: "Building & Consuming Packages", link: "/python/building-packages" },
            { text: "Command-Line Apps", link: "/python/cli-apps" },
            { text: "Standalone Executables", link: "/python/standalone-executables" },
          ],
        },
        {
          text: "Quality & Workflow",
          items: [
            { text: "Testing with pytest", link: "/python/testing-with-pytest" },
            { text: "Linting & Type Checking", link: "/python/tooling" },
            { text: "Jupyter Notebooks", link: "/python/jupyter-notebooks" },
          ],
        },
        {
          text: "Reference",
          items: [{ text: "Python Cheat Sheet", link: "/python/cheatsheet" }],
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
      "/git/": [
        {
          text: "Git & Collaboration",
          items: [{ text: "Overview", link: "/git/" }],
        },
        {
          text: "Foundations",
          items: [
            { text: "The Mental Model", link: "/git/mental-model" },
            { text: "The Everyday Workflow", link: "/git/everyday-workflow" },
          ],
        },
        {
          text: "Working with Others",
          items: [
            { text: "Branching, Merging & Rebasing", link: "/git/branching-merge-rebase" },
            { text: "Undoing Things", link: "/git/undoing-things" },
            { text: "Remotes & Pull Requests", link: "/git/remotes-and-prs" },
          ],
        },
        {
          text: "Repository Setup",
          items: [{ text: "Config, Ignore Files & Hooks", link: "/git/config-ignore-hooks" }],
        },
        {
          text: "Reference",
          items: [{ text: "Git Cheat Sheet", link: "/git/cheatsheet" }],
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
