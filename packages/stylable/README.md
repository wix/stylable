
![](./branding/logo/PNG/96-logo-OnlySymbol.png)

# Stylable - CSS for Components

> "New ideas will come along, but they will extend CSS rather than replace it. I believe that the CSS code we write today will be readable by computers 500 years from now."

[Håkon Wium Lie](https://dev.opera.com/articles/css-twenty-years-hakon/), co-creator of CSS

At Wix, we agree. We love CSS. It's simple, declarative syntax that is native in browsers and is easily the fastest way to add styles to web pages and web apps. But when writing CSS that is scoped to individual components, developers have to maintain highly-specific selectors, using elaborate conventions to fake namespacing. Writing and maintanining CSS across large teams and large projects can be tricky.

We want to extend CSS so that it is easier to use in a component ecosystem, but without losing the aspects of CSS that make it great: declarative, familiar, static and fast. So we created **Stylable**.

**Styable** is a preprocessor that allows you to write style rules in CSS syntax, with some extensions that we believe adhere to the spirit of CSS.

So what does **Stylable** do?

* Scopes styles to components so they don't "leak" and clash with other styles.
* Provides a style API to enable abstracting the internal structure of a component so that it can be styled externally. For example, you can style the label inside a button, or style the play button of a video player from outside these components.
* Uses mixins and variants so, for example, you can tell the same component to use a Wix theme or a Bootstrap theme.

At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid vanilla CSS that works cross-browser.

Viva CSS, and welcome **Stylable**. We hope you like it. Learn how to use it with step by step instructions and code examples.

## Components

[Stylable-components](https://github.com/wix/stylable-components) - react stylable components with mobx

## Guides

* [Install & Configure Stylable](./docs/guides/install-configure.md)

* [Component Basics](./docs/guides/component-basics.md)

* [Stylable Application](./docs/guides/stylable-application.md)

* [Stylable Component Library](./docs/guides/stylable-component-library.md)

## References

* [Imports](./docs/references/imports.md)

* [Root](./docs/references/root.md)

* [Class Selectors](./docs/references/class-selectors.md)

* [Tag Selectors](./docs/references/tag-selectors.md)

* [Extend stylesheet](./docs/references/extend-stylesheet.md)

* [Pseudo-Classes](./docs/references/pseudo-classes.md)

* [Pseudo-Elements](./docs/references/pseudo-elements.md)

* [Global selectors](./docs/references/global-selectors.md)

* [Compose CSS Class](./docs/references/compose-css-class.md)

* [Mixins](./docs/references/mixin-syntax.md)

* [Variables](./docs/references/variables.md)

* [Theme](./docs/references/theme.md)

* [Namespace](./docs/references/namespace.md)

## Useful Information

* [Cheatsheet](./docs/usefulInfo/cheatsheet.md)
