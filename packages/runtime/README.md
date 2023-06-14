# @stylable/runtime

[![npm version](https://img.shields.io/npm/v/@stylable/runtime.svg)](https://www.npmjs.com/package/@stylable/runtime)

`@stylable/runtime` provides the utility that is used to create the stylesheet functions that apply `classNames` and `states` to the DOM. It also exposes an optional DOM renderer that is responsible for loading CSS in its correct order.

End-users will usually not add this package directly as a dependency themselves, and would instead receive it as a dependency of their chosen integration (e.g. `@stylable/webpack-plugin`).

## Usage

`@stylable/runtime` exposes two methods, `Stylesheet` and `Renderer`.

### Stylesheet

When importing a Stylable stylesheet, there are multiple named exports that are exposed for usage.

```ts 
import { 
    style, 
    classes, 
    vars, 
    stVars, 
    keyframes, 
    layers, 
    containers, 
    cssStates 
} from './local.st.css';
```

|Import name|Description|
|-----------|-----------|
|`style`|utility function that returns a string to be used as a node class name for classes and states passed to it |
|`classes`|an object mapping exported classes from their source name to their scoped name |
|`vars`|an object mapping exported css custom properties (vars) from their source name to their scoped name |
|`stVars`|an object mapping build time Stylable variables to their build time values (these cannot be overridden in runtime) |
|`keyframes`|an object mapping exported keyframes from their source name to their scoped name |
|`layers`|an object mapping exported layers from their source name to their scoped name |
|`containers`|an object mapping exported containers from their source name to their scoped name |
|`cssStates`|utility function that maps an object representing states and their values to a string with all required classes |

#### Style utility function

The `style` function is useful for creating the `root` node of you component, passing along classes passed through props, or whenever a state is being defined.

```ts
style(
    contextClassName: string, stateOrClass: string | StateMap, ...classes: string[]
)
```

|Argument|Type|Description|Required|
|---------|----|-----------|:------:|
|contextClassName|`string`|`className` to be namespaced|`true`|
|stateOrClass|`StateMap` \| `string`|either an object containing states and their values, or a class string|`false`|
|classes|`string`|any other argument passed will represent a classes that should be applied. In any root node of a component, props.className should be passed along to maintain external customization |`false`|

```tsx
import { style, classes } from './local.st.css';

// properties passed to the component externally
props = { className: "app__root app--propstate" };

// The classes export exposes a map of classNames and their namespaced values.
classes.root;
// returns "local__root"

<div className={style(classes.root)} />
// becomes <div className="local__root" /> 

<div className={style(classes.root, { localState: true })} />
// becomes <div className="local__root local--localstate" /> 

<div className={style(classes.root, { localState: true }, props.className)} />
// becomes <div className="local__root local--localstate app__root app--propstate" /> 

<div className={style(classes.root, 'global-class', props.className)} />
// becomes <div className="local__root global-class app__root app--propstate" /> 

<div className={classes.part} />
// becomes <div className="local__part" /> 
```

### Renderer

Responsible for managing CSS files, linking to the `document` and maintaining their correct order in your application.

## TypeScript integration
When importing a Stylable stylesheet in TypeScript, a global module declaration needs to be defined in order to not receive type errors about unknown imports.

Add the following file to your `/src` directory.
```ts
// globals.d.ts
declare module '*.st.css' {
    export * from '@stylable/runtime/stylesheet';

    const defaultExport: unknown;
    export default defaultExport;
}
```

## License
Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [MIT license](./LICENSE).
