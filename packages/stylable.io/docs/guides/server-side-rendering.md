---
id: guides/ssr
title: Supporting Server Side Rendering
layout: docs
---

Server side rendering (SSR) is an approach to serving JavaScript rendered web applications (such as React, Vue, Angular, etc...) that tries to improve time-to-paint, SEO support and more.

To learn more about SSR - see this [introduction post](https://dev.to/sunnysingh/the-benefits-and-origins-of-server-side-rendering-4doh).

When creating your library / application you will see that you might need to make some changes to your project publish / consumption process in order to integrate Stylable to your SSR flow.

## Rendering Stylable in the Client
To integrate Stylable into your application, use `@stylable/webpack-plugin` and [configure](https://github.com/wix/stylable/tree/master/packages/webpack-plugin) it according to your project needs.

## Transforming Stylable in the Server
In order to use Stylable imports from your source files in `nodeJS`, you will need to add `@stylable/node` as a dependency.

Import and use its `requireHook` method before rendering to enable requiring Stylable stylesheets in their `CommonJS` module format.

```js
// server.js 
const { attachHook } = require('@stylable/node');

attachHook(); // enables requiring .st.css files as CommonJS

// < render application ... >
```

## Matching namespaces
In order to ensure full SSR compatibility, **generated namespaces for all stylesheets must match exactly** across all different build targets.

The default Stylable `namespaceResolver` uses a combination of file-system path, name and version from the `package.json` file to create its namespace. This means that namespaces can be influenced by the published file path structure.

If you choose to provide an alternative namespace resolver that does not depend on file paths as part of its namespace creation, then you can avoid the problem described below.

### Supporting multiple transpilation targets

When building a library or application for consumption in both client and server environments it is common to output multiple transpilation targets for various module systems.

This means that a published project will usually have both `CommonJS` and `ES modules`, each with their own transpiled copy of the project, including the Stylable assets.

This can pose a problem when trying to synchronize namespace creation for SSR. 

### Publishing SSR-ready source files (`*.st.css`)

The Stylable CLI offers a feature that allows you to sync your namespace across dist targets by inserting a custom header comment to the start of your `.st.css` file. This header comment is used to normalize namespacing paths across different build targets.

When using `@stylable/cli` to publish your source stylesheets, use the `useNamespaceReference` flag to mark all targets as originating from the same original source.

```sh
stc --srcDir ./src --outDir ./dist/cjs --cjs --stcss --useNamespaceReference
```
```sh
stc --srcDir ./src --outDir ./dist/esm --esm --stcss --useNamespaceReference
```

For this to work properly, your source folder must be published along with your distribution build targets.
