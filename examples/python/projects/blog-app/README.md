# blog-app

The consumer half of the packaging example: an application that depends on
`slugkit` from `../slugkit` as an editable path dependency.

```bash
poetry install     # installs slugkit (editable, from ../slugkit) and blog-app
poetry run blog-app
```
