---
id: getting-started/install-configure
title: Installation
layout: docs
---

Install **stylable** and **stylable-integration** as a dependency in your local project.

Using npm:
```bash
npm install stylable stylable-integration --save-dev
```
Using yarn:
```bash
yarn add stylable stylable-integration
```

## Build Config

* Right now we only support webpack as our build system. for library authoring we have a cli tool to build each css separately.

Add stylable to your webpack config: 


```
const StylablePlugin = require('stylable-integration/webpack-plugin');
...
{
    module: {
        rules: [
            StylablePlugin.rule(),
            // in order to load css assets from bundle we need the url loader configured.
            // example configuration
            {
                test: /\.(png|jpg|gif|svg)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new StylablePlugin({ injectBundleCss: true  /* dev mode */ })
    ]
}
```

for production build you should not use injectBundleCss option. we create a bundle css asset in your output dir just load it in your html.

