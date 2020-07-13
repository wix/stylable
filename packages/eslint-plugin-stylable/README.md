# Stylable eslint plugin

Adds Stylable lint rules that warn about usages of unknown stylesheet locals (classes, css vars, Stylable vars and keyframes).

## Install

`npm install eslint-plugin-stylable --save-dev`
or
`yarn add eslint-plugin-stylable --dev`

## Config

`.eslintrc` config

```json
  "plugins": ["stylable"],
  "rules": {
    "stylable/unknown-locals": "error",
  }
```

### Options

| Option	| Type  | Default | Description |
|-----------|:-----:|:-------:|-------------|
| `resolveOptions` | `object` | `{}` | Stylable resolver options |
| `exposeDiagnosticsReports` | `boolean` | `false` | expose Stylable transpilation diagnostics on the import statement |
