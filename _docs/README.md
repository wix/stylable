![](../branding/logo/PNG/96-logo-horizontal.png)

# Stylable - CSS for Components

> "New ideas will come along, but they will extend CSS rather than replace it. I believe that the CSS code we write today will be readable by computers 500 years from now."

[Håkon Wium Lie](https://dev.opera.com/articles/css-twenty-years-hakon/), co-creator of CSS

At Wix, we agree. We love CSS. It's simple, declarative syntax that is native in browsers is easily the fastest way to add styles to web pages and web apps. But when writing CSS that is scoped to individual components, developers have to maintain highly-specific selectors, using elaborate conventions to fake namespacing. Writing and maintanining CSS across large teams and large projects can be tricky.

We want to extend CSS so that it is easier to use in a component ecosystem, but without losing the aspects of CSS that make it great: declarative, familiar, static and fast. So we created **Stylable**.

**Styable** is a preprocessor that allows you to write style rules in CSS syntax, with some extensions that we believe adhere to the spirit of CSS.

So what does **Stylable** do?

* Scopes styles to components so they don't "leak" and clash with other styles.
* Provides a style API to enable abstracting the internal structure of a component so that it can be styled externally. For example, you can style the label inside a button, or style the play button of a video player from outside these components.
* Uses mixins and variants so, for example, you can tell the same component to use a Wix theme or a Bootstrap theme.

At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid vanilla CSS that works cross-browser.

Viva CSS, and welcome **Stylable**. We hope you like it. Learn how to use it with step by step instructions and code examples.

[note somewhere that there is a JS API for advanced users]

## playground examples
simple example 2 components, 2 CSS files - show pseudo element and state
...add more examples

## Components

[Stylable-components](https://github.com/wix/stylable-components) - react stylable components with mobx

### Definitly Stylable

**Stylable** includes stylesheet definitions so you can use components that were not written with **Stylable** in your **Stylable** project.

[Definitly Stylable](./components/definitly-stylable.md)

## Guides

[Install, Configure & Build](./guides/installconfigure.md)
w/ specific webpack instructions plus build

[Create a Stylable Component](./guides/createcomponent.md)
define a stylesheet - CSS
React integration (auto-root, string classnames, states),

[Use and Style Components](./guides/usestylecomponents.md)
import
tag selector v.s. class selector
pseudo elements and pseudo classes

[Use 3rd Party Components](./guides/use3rdparty.md)
link to available known projects (when we have)
install
import
...same as source components...

[Configure a Web Application](./guides/configurewebapp.md)

[Configure a Component Library](./guides/configurelibrary.md)

[Integrate with React](./guides/react-integration.md)

## Advanced Guides

[Create Layouts Using Mixins](./guides/create-layouts.md)
base layouters,
custom layouter - write your own

[Theme Components](./guides/themecomponents.md)
variables,
variants,
override varibales using styling

[Debug Your CSS](./guides/debugging.md)

[Specificity]()

[Advanced Styling Patterns]()
css tabs,
case: tooltip,
timers,
Structural state dependencies

[Integrate with React](./guides/react-integration.md)

[Library Output](./guides/library-output.md)

## References

[Imports](./references/imports.md)

[Root](./references/root.md)

[Class Selectors](./references/class-selectors.md)

[Tag Selectors](./references/tag-selectors.md)

[Extend stylesheet](./references/extend-stylesheet.md)

[Pseudo-Classes](./references/pseudo-classes.md)

[Pseudo-Elements](./references/pseudo-elements.md)

[Custom selectors](./references/custom-selectors)

[Global selectors](./references/global-selectors)

[Compose CSS Class](./references/compose-css-class.md)

[Formatters](./references/formatters)

[Mixins](./references/mixin-syntax.md)

[Variants](./references/variants.md)

[Variables](./references/variables.md)

[namespace](./references/namespace.md)

## Useful Information

[Cheatsheet](./usefulInfo/cheatsheet.md)

[Overview](./usefulInfo/Overview.md)

[Best practices to style components]() - ToDo

[How to work with an existing project]() - ToDo
