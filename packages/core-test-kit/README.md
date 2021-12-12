# @stylable/core-test-kit

[![npm version](https://img.shields.io/npm/v/@stylable/core-test-kit.svg)](https://www.npmjs.com/package/stylable/core-test-kit)

`@stylable/core-test-kit` is a collection of utilities aimed at making testing Stylable core behavior and functionality easier.

## What's in this test-kit?

### Matchers

An assortment of `Chai` matchers used by Stylable.

- `flat-match` - flattens and matches passed arguments
- `results` - test Stylable transpiled style rules output

### Diagnostics tooling

A collection of tools used for testing Stylable diagnostics messages (warnings and errors).

- `expectAnalyzeDiagnostics` - processes a Stylable input and checks for diagnostics during processing
- `expectTransformDiagnostics` - checks for diagnostics after a full transformation
- `shouldReportNoDiagnostics` - helper to check no diagnostics were reported

### Testing infrastructure

Used for setting up Stylable instances (`processor`/`transformer`) and their infrastructure:

- `generateInfra` - create Stylable basic in memory infrastructure (`resolver`, `requireModule`, `fileProcessor`)
- `generateStylableResult` - genetare transformation results from in memory configuration
- `generateStylableRoot` - helper over `generateStylableResult` that returns the `outputAst`
- `generateStylableExports` - helper over `generateStylableResult` that returns the `exports` mapping

### `testInlineExpects` utility

Exposes `testInlineExpects` for testing transformed stylesheets that include inline expectation comments. These are the most common type of core tests and the recommended way of testing the core functionality.

#### Supported checks:

Rule checking (place just before rule) supporting multi-line declarations and multiple `@checks` statements

##### Terminilogy
- `LABEL: <string>` - label for the test expectation 
- `OFFEST: <number>` - offest for the tested rule after the `@check`   
- `SELECTOR: <string>` - output selector
- `DECL: <string>` - declaration name
- `VALUE: <string>` - declaration value 

Full options:
```css
/* @check(LABEL)[OFFEST] SELECTOR {DECL: VALUE} */
```

Basic - `@check SELECTOR`
```css 
/* @check header::before */
header::before {}
```

With declarations - ` @check SELECTOR {DECL1: VALUE1; DECL2: VALUE2;}`

This will check full match and order.
```css 
.my-mixin {
    color: red;
}

/* @check .entry__container {color: red;} */
.container {
    -st-mixin: my-mixin;
}
```

Target generated rules (mixin) - ` @check[OFFEST] SELECTOR`
```css
.my-mixin {
    color: blue;
}
/* 
    @check[1] .entry__container:hover {color: blue;} 
*/
.container {
    -st-mixin: my-mixin;
}
```

Support atrule params (anything between the @atrule and body or semicolon):
```css
/* @check screen and (min-width: 900px) */
@media value(smallScreen) {}
```
#### Example 
Here we are generating a Stylable AST which lncludes the `/* @check SELECTOR */` comment to test the root class selector target.

The `testInlineExpects` function performs that actual assertions to perform the test.

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

Copyright (c) 2019 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).
