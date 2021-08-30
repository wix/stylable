# Stylable eslint plugin

Adds Stylable lint rules that warn about usages of unknown stylesheet locals (classes, css vars, Stylable vars and keyframes).

## Example
Trying to access an unknown class from the `comp.st.css` stylesheet:
```css
/* comp.st.css */
.root {}
.part {}
```

```tsx
import { classes } from './comp.st.css';

// ...

const render = (<div className={classes.root} >
  <div className={classes.missing} /> // unknown local class "missing" used from stylesheet ./comp.st.css
</div>)
```

## Install

`npm install eslint-plugin-stylable --save-dev`
or
`yarn add eslint-plugin-stylable --dev`

## Config

`.eslintrc` config

```json
  "extends": ["plugin:stylable/recommended"]
```

### Options

| Option	| Type  | Default | Description |
|-----------|:-----:|:-------:|-------------|
| `resolveOptions` | `object` | `{}` | Stylable resolver options |
| `exposeDiagnosticsReports` | `boolean` | `false` | expose Stylable transpilation diagnostics on the import statement |

## Known issue

ESLint is not intended for multi-file operations, such as validating your TS when an `.st.css` files changes. This means that the plugin might lose track of stylesheet changes and work with stale data.

This behavior will show out-of-date errors or will miss new errors in your TS files. Manually triggering a change in the stylesheet file will sync ESlint and update the diagnostics.

## License

Copyright (c) 2021 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).