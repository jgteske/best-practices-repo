---
layout: home

hero:
  name: "Best Practices Repo"
  text: "Documentation, built from Markdown"
  tagline: In-depth TypeScript, React, JavaScript/Node.js, and Linux/Bash guides - with every code sample checked in CI.
  actions:
    - theme: brand
      text: TypeScript Best Practices
      link: /typescript/
    - theme: brand
      text: React Best Practices
      link: /react/
    - theme: brand
      text: JavaScript & Node.js
      link: /javascript/
    - theme: brand
      text: Linux, Bash & the Terminal
      link: /linux/
    - theme: alt
      text: How this site is built
      link: /guide/

features:
  - title: Markdown in, static site out
    details: Every page here is a plain .md file. VitePress turns the docs/ folder into a fast, searchable static site - no hand-rolled build tooling required.
  - title: Examples that can't go stale
    details: Code samples are imported directly from real files in examples/ - type-checked with tsc, parsed and linted with bash -n and shellcheck, and in the case of the JavaScript examples actually executed - so the docs and the code they describe can never drift apart.
  - title: General-purpose, growing
    details: This repo isn't TypeScript-only. The structure under docs/ is meant to hold best-practice guides for any topic - add a new top-level folder and a sidebar entry to start one.
---
