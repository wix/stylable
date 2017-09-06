
![Stylable logo](../branding/logo/PNG/96-logo-OnlySymbol.png)

# Stylable - CSS for Components

> "New ideas will come along, but they will extend CSS rather than replace it. I believe that the CSS code we write today will be readable by computers 500 years from now."

[Håkon Wium Lie](https://dev.opera.com/articles/css-twenty-years-hakon/), co-creator of CSS

At Wix, we agree. We love CSS. It's simple, declarative syntax that is native in browsers and is easily the fastest way to add styles to web pages and web apps. But when writing CSS that is scoped to individual components, developers have to maintain highly-specific selectors, using elaborate conventions to fake namespacing. Writing and maintanining CSS across large teams and large projects can be tricky.

We want to extend CSS so that it is easier to use in a component ecosystem, but without losing the aspects of CSS that make it great: declarative, familiar, static and fast. So we created **Stylable**.

**Styable** is a preprocessor that allows you to write style rules in CSS syntax, with some extensions that we believe adhere to the spirit of CSS.

So what does **Stylable** do?

*  Scopes styles to components so they don't "leak" and clash with other styles.
* Enables custom pseudo-classes and pseudo-elements that abstract the internal structure of a component. These can then be styled externally. For example, you can style the label inside a button, or style the play button of a video player from outside these components.
* Uses themes so you can apply different look and feel across your web application, for example, the same component can use a Wix theme or a Bootstrap theme depending on the page.

At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid vanilla CSS that works cross-browser.

Viva CSS, and welcome **Stylable**. We hope you like it. Learn how to use it with step by step instructions and code examples.

## Components

[Stylable-components](https://github.com/wix/stylable-components) - React **Stylable** components with MobX

## Guides

* [Install & Configure Stylable](./guides/install-configure.md)

* [Component Basics](./guides/component-basics.md)

* [Stylable Application](./guides/stylable-application.md)

* [Stylable Component Library](./guides/stylable-component-library.md)

## Reference

* [Imports](./references/imports.md)

* [Root](./references/root.md)

* [Class Selectors](./references/class-selectors.md)

* [Tag Selectors](./references/tag-selectors.md)

* [Extend stylesheet](./references/extend-stylesheet.md)

* [Pseudo-Classes](./references/pseudo-classes.md)

* [Pseudo-Elements](./references/pseudo-elements.md)

* [Global selectors](./references/global-selectors.md)

* [Compose CSS Class](./references/compose-css-class.md)

* [Mixins](./references/mixin-syntax.md)

* [Variables](./references/variables.md)

* [Theme](./references/theme.md)

* [Namespace](./references/namespace.md)

## Useful Information

* [Cheatsheet](./usefulInfo/cheatsheet.md)
