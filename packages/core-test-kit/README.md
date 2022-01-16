# @stylable/core-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/core-test-kit.svg)](https://www.npmjs.com/package/stylable/core-test-kit)

## Inline expectations syntax

The inline expectation syntax can be used with `testInlineExpects` for testing stylesheets transformation and diagnostics.

An expectation is written as a comment just before the code it checks on. All expectations support `label` that will be thrown as part of an expectation fail message.

### `@rule` - check rule transformation including selector and nested declarations:

Selector - `@rule SELECTOR`
```css 
/* @rule .entry__root::before */
.root::before {}
```

Declarations - `@rule SELECTOR { decl: val; }`
```css 
/* @rule .entry__root { color: red } */
.root { color: red; }

/* @rule .entry__root {
    color: red;
    background: green;
}*/
.root {
    color: red;
    background: green;
}
```

Target generated rules (mixin) - ` @rule[OFFSET] SELECTOR`
```css
.mix {
    color: red;
}
.mix:hover {
    color: green;
}
/* 
    @rule .entry__root {color: red;} 
    @rule[1] .entry__root:hover {color: green;} 
*/
.root {
    -st-mixin: mix;
}
```

Label - `@rule(LABEL) SELECTOR`
```css
/* @rule(expect 1) .entry__root */
.root {}

/* @rule(expect 2) .entry__part */
.part {}
```

### `@atrule` - check at-rule transformation of params:

AtRule params - `@atrule PARAMS`:
```css
/* @atrule screen and (min-width: 900px) */
@media value(smallScreen) {}
```

Label - `@atrule(LABEL) PARAMS`
```css
/* @atrule(jump keyframes) entry__jump */
@keyframes jump {}
```

### `@decl` - check declaration transformation

Prop & value - `@decl PROP: VALUE`
```css
.root {
    /* @decl color: red */
    color: red
}
```

Label - `@decl(LABEL) PROP: VALUE`
```css
.root {
    /* @decl(color is red) color: red */
    color: red;
}
```

### `@analyze` & `@transform` - check single file (analyze) and multiple files (transform) diagnostics:

Severity - `@analyze-SEVERITY MESSAGE` / `@transform-SEVERITY MESSAGE`
```css
/* @analyze-info found deprecated usage */
@st-global-custom-property --x;

/* @analyze-warn missing keyframes name */
@keyframes {}

/* @analyze-error invalid functional id */
#id() {}

.root {
    /* @transform-error unresolved "unknown" build variable */
    color: value(unknown);
}
```

Word - `@analyze-SEVERITY word(TEXT) MESSAGE` / `@transform-SEVERITY word(TEXT) MESSAGE`
```css
/* @transform-warn word(unknown) unknown pseudo element */
.root::unknown {}
```

Label - `@analyze(LABEL) MESSAGE` / `@transform(LABEL) MESSAGE`
```css
/* @analyze-warn(local keyframes) missing keyframes name */
@keyframes {}

/* @transform-warn(imported keyframes) unresolved keyframes "unknown" */
@keyframes unknown {}
```

## License

Copyright (c) 2019 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).
