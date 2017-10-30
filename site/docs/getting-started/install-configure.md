---
id: getting-started/install-configure
title: Installation
redirect_from: "docs/index.html"
layout: docs
---

There are currently two options for installing and working with **Stylable** as described in the following sections.

## Write your own project based on a Stylable boilerplate

To begin writing your own project, you can create a **Stylable** app from our boilerplate. It is based on [create-react-app](https://github.com/facebookincubator/create-react-app). To create the project, follow these instructions: 

Using npm:
```bash
npm install -g create-react-app

create-react-app my-app-name --scripts-version stylable-scripts
```
For the `my-app-name` value above, replace with the name of your project. Once you run the command, a directory with that same name is created. Go to that directory and run `yarn start` or `yarn build` to create the project in a browser.

The project includes several basic components and **Stylable** stylesheets which have the suffix `.st.css`. 

## Install Stylable to work with an existing project

To work with an existing project, you can install **stylable** and the **stylable-integration** packages from our GitHub [repository](https://github.com/wix/stylable). 

Install **stylable** and **stylable-integration** as a dependency in your local project.

Using npm:
```bash
npm install stylable stylable-integration --save-dev
```
Using Yarn:
```bash
yarn add stylable stylable-integration
```

## Write in Stylable

Once you've installed either the boilerplate or the packages into your own project, you can begin writing in **Stylable**. Look through the [Specifications Reference](./cheatsheet.md) for specs and code examples. 

To take advantage of code completion and diagnostics, install [**Stylable Intelligence**](./stylable-intelligence.md) currently supported for only Visual Studio Code (version 1.16 and later).

## Build configuration

Currently we support Webpack as our build system. To author a component library, use our CLI tool to build each CSS separately.

Add **Stylable** to your Webpack configuration as follows: 

```
const StylablePlugin = require('stylable-integration/webpack-plugin');
...
{
    module: {
        rules: [
            StylablePlugin.rule(),
            // to load CSS assets from bundle we need the url loader configured.
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

For a production build, you should not use the `injectBundleCss` option. The project creates a bundle CSS asset in your output directory. Just load this into your html. You can set the file name. For details, see [**stylable-integration**](https://github.com/wix/stylable-integration).

