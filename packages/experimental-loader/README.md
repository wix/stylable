# Experimental Stylable Webpack Loader

This loader supports working with `mini-css-extract-plugin`. Internally, this setup uses two seperate loaders.

- `stylable-transform-loader` - responsible for Stylable transformations and generates the `css-loader` compatible output that the `mini-css-extract-plugin` expects
- `stylable-runtime-loader` - Stylable offers a richer module API compared to css modules. The `css-loader` flow does not support this API, and so we are using this loader to convert the raw Stylable locals data to the appropriate runtime stylesheet

## Disclaimer

This loader is **experimental** and currently **not the recommended way** of integrating Stylable into your project.  
Use `@stylable/webpack-plugin` for the latest stable integration.

## Example

A minimal webpack configuration using the two Stylable loaders in conjuction with the `mini-css-extract-plugin` loader:

```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { stylableLoaders } = require('@stylable/experimental-loader');

module.exports = {
  plugins: [new MiniCssExtractPlugin()],
  module: {
    rules: [
      {
        test: /\.st\.css$/i,
        use: [
          stylableLoaders.runtime(),
          {
            loader: MiniCssExtractPlugin.loader,
            options: { reloadAll: true },
          },
          stylableLoaders.transform(),
        ],
      },
      // load asset from CSS url()
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
            },
          },
        ],
      },
    ],
  },
};
```

## Transform loader options

```ts
interface LoaderOptions {
  resolveNamespace?(namespace: string, filePath: string): string;
  filterUrls?(url: string, ctx: loader.LoaderContext): boolean;
  exportsOnly?: boolean;
  alwaysEmitErrors?: boolean;
}
```

| Option             | Description                                   |
| ------------------ | --------------------------------------------- |
| `resolveNamespace` | override default stylesheet namespace process |
| `filterUrls`       | filter urls from webpack process              |
| `exportsOnly`      | only export the runtime stylesheet            |
| `alwaysEmitErrors` | always emit stylable diagnostics as errors    |

## SSR (exportsOnly)

When building Stylable for consumption in a server-side renderer build, you may want to extract only the exports of the runtime stylesheets and not the content of their CSS. In such a case you would only be required to use the `transform` loader and  the `exportsOnly` option.

```js
{
  test: /\.st\.css$/i,
  use: [
    stylableLoaders.transform({ exportsOnly: true }),
  ],
}
```

## Known issues

As opposed to the current webpack-plugin integration, some behaviors are still missing, or lacking:

- The loader does not perform Stylable specific optimizations such as: minimizing namespaces and classNames, removing unused rules, and so on
- May encounter issues with CSS loading order (order being determined by JS imports) - [webpack open issue](https://github.com/webpack-contrib/mini-css-extract-plugin/issues/530)
- May have issues with updating CSS when JS imports change order in dev time watch mode
