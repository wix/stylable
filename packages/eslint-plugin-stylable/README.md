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
