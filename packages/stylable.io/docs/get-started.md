---
id: get-started
title: Getting Started
redirect_from: "docs/index.html"
layout: docs
---

## What is Stylable

**Stylable** is a CSS preprocessor that enables you to write reusable, highly-performant, styled components. Each component exposes a style API that maps its internal parts so you can reuse components across teams without sacrificing stylability.

* Scopes styles to components so they don't "leak" and clash with other styles.
* Enables custom pseudo-classes and pseudo-elements that abstract the internal structure of a component. These can then be styled externally.

At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid, vanilla CSS that works cross-browser.

## How do I install

There are currently two options for installing and working with **Stylable**:

* To begin writing your own project, you can [create a **Stylable** app](./getting-started/install-configure.md) from our boilerplate. 

* To work with an existing project, you can install [stylable](https://github.com/wix/stylable) and the [stylable-webpack-plugin](https://github.com/wix/stylable-webpack-plugin) packages from GitHub. 

 While **Stylable** can work with any component framework, we offer a [React component integration](./getting-started/react-integration.md) that works with both installation options. If you're a Vue.js fan, here's an example of [Vue and Stylable](https://github.com/wix-playground/stylable-vue-example) working together.

Optionally, you can install [**Stylable Intelligence**](./getting-started/stylable-intelligence.md), an extension providing IDE support for code completion and diagnostics. Currently supported for only Visual Studio Code (version 1.18 and later).

## What can I do

* **Build a Stylable component** - If you are looking to style a component, follow the steps in the [Stylable Basics Guide](../docs/guides/components-basics.md) and [Best Practices Guide](../docs/guides/stylable-component-best-practices.md)

* **Build an app** - If you want to use **Stylable** while building a web application, go to [Build a Stylable Application](../docs/guides/stylable-application.md). Read the steps and recommendations for building a performant web application that doesn't depend on other libraries for styling.

* **Create a library** - If you want guidance in creating a component library, read [Create a Stylable Component Library](../docs/guides/stylable-component-library.md). Here you can follow our recommendations for building a library that can be used cross-project and includes theming, external styling and reusable components.

* **Learn** - Take a look at our [specification reference documents](./getting-started/cheatsheet.md) to get more acquanted with our code and for specific code examples. Use the overview as a cheatsheet to help you keep track of **Stylable** syntax.

