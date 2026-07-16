import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Best Practices Repo",
  description: "A general documentation site, built from Markdown, with an in-depth TypeScript best practices guide.",
  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "TypeScript", link: "/typescript/" },
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
          items: [
            { text: "Overview", link: "/typescript/" },
            { text: "Event Listeners with Classes", link: "/typescript/event-listeners-with-classes" },
            { text: "Derive Types with typeof", link: "/typescript/derive-types-with-typeof" },
            { text: "Exhaustive Checks with never", link: "/typescript/exhaustive-checks-with-never" },
            { text: "Type-Safe Validation", link: "/typescript/type-safe-validation" },
            { text: "General Best Practices", link: "/typescript/general-best-practices" },
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
});
