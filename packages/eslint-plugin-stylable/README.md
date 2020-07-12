# Stylable eslint plugin

Add stylable lint rules to find usages of unused locals symbol when using stylesheet api  

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
