[![npm version](https://img.shields.io/npm/v/stylable-runtime.svg)](https://www.npmjs.com/package/stylable-runtime)

`@stylable/runtime` provides the utility that is used to create the stylesheet functions that apply `classNames` and `states` to the DOM. It also exposes an optional DOM renderer that is responsible for loading CSS in its correct order.

End-users will usually not add this package directly as a dependency themselves, and would instead receive it as a dependency of their chosen integration (e.g. `stylable-webpack-plugin`).

## Usage
`@stylable/runtime` exposes two methods, `Stylesheet` and `Renderer`.

### Stylesheet 
The stylesheet function is returned when importing a **Stylable** stylesheet. It is used for creating the DOM-attributes required for CSS to be applied.

```ts
style(className: string, states?: StateMap, props: InheritedAttributes)
```

|Argument|Type|Description|Required|
|---------|----|-----------|:------:|
|className|string|`className` to be namespaced|true|
|states|[StateMap](https://github.com/wix/stylable/blob/master/packages/stylable-runtime/src/types.ts#L3)|object containing states and their values|false|
|inheritedAttributes|[InheritedAttributes](https://github.com/wix/stylable/blob/master/packages/stylable-runtime/src/types.ts#L12)|`props` passed to the root node from the parent component (automatically passing through `className` and `data-*` attributes) |false|

```tsx
import style from './local.st.css';

props = {
    className: "app1211903207--root",
    "data-app1211903207-propstate": true
}

style('root');
// returns "{
//     "className": "local1211372639--root"
// }"

style('root', {localState: true});
// returns "{
//     "data-local1211372639-localstate": true,
//     "className": "local1211372639--root"
// }"

style('root', {localState: true}, props);
// returns "{
//     "data-local1211372639-localstate": true,
//     "data-app1211903207-propstate": true,
//     "className": "local1211372639--root app1211903207--root"
// }"

// The stylesheet function also exposes a map of classNames and their namespaced values.
style.root;
// returns "local1211372639--root"
```

### Renderer 
Responsible for managing CSS files, linking to the `document` and maintaining their correct order in your application.

## License

Copyright (c) 2017 Wix.com Ltd. All Rights Reserved. Use of this source code is governed by a [BSD license](./LICENSE).


