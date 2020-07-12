# Stylable eslint plugin

Add stylable lint rules to find usages of unused locals symbol when using the stylesheet api.

## Install

`npm install eslint-plugin-stylable --save-dev`
or
`yarn add eslint-plugin-stylable --dev`

## Config

.eslint config

```json
  "plugins": ["stylable"],
  "rules": {
    "stylable/unknown-locals": "error",
  }
```

### Options

| Option	| Type  | Default | Description |
|-----------|:-----:|:-------:|-------------|
| resolveOptions | object | {} | stylable resolver options |
| exposeDiagnosticsReports | boolean | false | expose st.css diagnostics at the import location |
