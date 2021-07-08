# @stylable/core-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/core-test-kit.svg)](https://www.npmjs.com/package/stylable/core-test-kit)

`@stylable/core-test-kit` is a collection of utilities aimed at making testing Stylable core behavior and functionality easier.

## What's in this test-kit?

### Matchers

An assortment of `Chai` matchers used by Stylable.

- `flat-match` - flattens and matches passed arguments
- `results` - test Stylable transpiled style rules output

### Diagnostics tooling

A collection of tools aimed at testing Stylable diagnostics messages (warnings and errors).

### Testing infrastructure

Used for easily setting up Stylable instances (processor/transformer) and its infrastructure.

`generateInfra` - create Stylable basic in memory infrastructure (resolver, requireModule, fileProcessor)

`generateStylableResult` - genetare transform result from in memory configuration

`generateStylableRoot` - helper over `generateStylableResult` that returns the outputAst

`generateStylableExports` - helper over `generateStylableResult` that returns the exports mapping

### testInlineExpects

Exposes `testInlineExpects` for Test transformed stylesheets with inline expectation comments. These are the most common core tests and the recommended way to test the core transform functionality. 

#### `Supported checks:` 

Rule checking (place just before rule) support multi line declarations and multiple @checks

##### Terminilogy
LABEL <string> - label for the test expectation 
OFFEST <number> - offest for the tested rule after the @check   
SELECTOR <string> - the output selector
DECL <string> - name of the declaration
VALUE <string> - value of the declaration 

full options:
```css
/* @check(LABEL)[OFFEST] SELECTOR {DECL: VALUE} */
```

basic:
```css 
/* @check SELECTOR */
```

with declarations (will check full match and order):
```css
/* @check SELECTOR {DECL1: VALUE1; DECL2: VALUE2} */
```

target generated rules (mixin):
```css
/* @check[OFFEST] SELECTOR */
```

support atrule params (anything between the @atrule and body or semicolon):
```css
/* @check screen and (min-width: 900px) */
```
#### Example 
Using the `/* @check SELECTOR */` comment to test the root class selector target 

```ts
it('...', ()=>{
    const root = generateStylableRoot({
        entry: `/style.st.css`,
        files: {
            '/style.st.css': {
                namespace: 'ns',
                content: `
                /* @check .ns__root */
                .root {}
            `
        },
    });
    testInlineExpects(root, 1);
})
```

### Match rules

Exposes two utility functions (`matchRuleAndDeclaration` and `matchAllRulesAndDeclarations`) used for testing Stylable generated AST representing CSS rules and declarations.

## License

Copyright (c) 2019 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).
