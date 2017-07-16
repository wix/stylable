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

Viva CSS, and welcome **Stylable**. We hope you like it. Check out our [features](./features.md) and learn how to use it with step by step instructions and code examples.

[note somewhere that there is a JS API for advanced users]

## playground examples
simple example 2 components, 2 CSS files - show pseudo element and state
...add more examples

## Components

[wix-react-components](https://github.com/wix/wix-react-components) - react stylable components with mobx

### Definitly Stylable

Stylable stylesheet definitions, so you can use components that are not stylable in your stylable project.

[Definitly Stylable](./definitly-stylable.md)

## Guides

[Install, Configure & Build](./installconfigure.md)
w/ specific webpack instructions plus build

[Create a Stylable Component](./createcomponent.md)
define a stylesheet - CSS
React integration (auto-root, string classnames, states),

[Use and Style Components](./usestylecomponents.md)
import
tag selector v.s. class selector
pseudo elements and pseudo classes

[Use 3rd Party Components](./use3rdparty.md)
link to available known projects (when we have)
install
import
...same as source components...

[Create Layouts Using Mixins](./create-layouts.md)
base layouters,
custom layouter - write your own

[Theme Components](./themecomponents.md)
variables,
variants,
override varibales using styling

[Debugging](./debugging.md)

[Specificity]()

[Advanced Styling Patterns]()
css tabs,
case: tooltip,
timers,
Structural state dependencies

[Use Javascript API](./usejsapi.md)

[Configure a Web Application](./configurewebapp.md)

[Configure a Component Library](./configurelibrary.md)

[React Integration](./react-integration.md)

## References

[Imports](./imports.md)

[Root](./root.md)

[Class Selectors](./class-selectors.md)

[Tag Selectors](./tag-selectors.md)

[Extend stylesheet](./extend-stylesheet.md)

[Pseudo-Classes](./pseudo-classes.md)

[Pseudo-Elements](./pseudo-elements.md)

[Custom selectors](./custom-selectors)

[Global selectors](./global-selectors)

[Formatters](./formatters)

[Mixins](./mixin-syntax.md)

[Variants](./variants.md)

[Variables](./variables.md)

## Useful Information
[Cheatsheet](./cheatsheet.md)

[Overview](./Overview.md)

[Best practices to style components]() - ToDo

[How to work with an existing project]() - ToDo
