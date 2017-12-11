---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults

id: welcome
title:
redirect_from: "docs/index.html"
layout: docs
---

<img class="home-logo" src="{{ site.baseurl }}/images/96-logo-vertical.svg" alt="Stylable - CSS for Components" />

<p class="quote">New ideas will come along, but they will extend CSS rather than replace it. I believe that the CSS code we write today will be readable by computers 500 years from now.<br>
– <a href="https://dev.opera.com/articles/css-twenty-years-hakon/">Håkon Wium Lie</a>, co-creator of CSS.
</p>




At Wix, we agree. We &hearts; CSS. Its simple, declarative syntax that is native in browsers is easily the fastest way to add styles to web pages and web apps. But when writing CSS that is scoped to individual components, developers have to maintain highly-specific selectors, using elaborate conventions to fake namespacing. Writing and maintaining CSS across large teams and large projects can be tricky.

We also &hearts; TypeScript. TypeScript helps us manage these large projects, exposing at build-time what we could once only see at run-time. 

We want to give CSS a type system - to do for CSS what TypeScript does for JavaScript. We want to:

* **Extend CSS** so that it is easier to use in a component ecosystem, but without losing the aspects of CSS that make it great: declarative, familiar, static and fast. 
* Create **CSS macros** with JavaScript and use them at build time.
* Use language services like **code completion** and **validation**. Each component exposes a style API that maps its internal parts and states so you can reuse components across teams without sacrificing stylability or scalability.
* Provide the ability to see our **errors at build** time or even while [working in our IDE](https://marketplace.visualstudio.com/items?itemName=wix.stylable-intelligence). Wave goodbye to silent run-time breakage misery!

So we created **Stylable** — a CSS preprocessor that allows you to write style rules in CSS syntax, with some extensions that we believe adhere to the spirit of CSS.

![Stylable Intelligence](./images/intelligence.gif)

## How does Stylable perform this voodoo?

* **Stylable** scopes styles to components so they don’t “leak” and clash with other styles.
* **Stylable** enables custom pseudo-classes and pseudo-elements that abstract the internal state and structure of a component. These can then be styled externally. For example, you can style the label inside a button, or style the play button of a video player from outside these components.
* **Stylable** sets themes so you can apply a different look and feel across your web application, for example, the same component can use a Wix theme or a Bootstrap theme depending on the page.
* At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid, vanilla CSS that works cross-browser.


## Shut up and take my money!

No need! **Stylable** is BSD-licensed. Take it, use it, make your development easier and your apps faster.

Viva CSS, and welcome **Stylable**. We hope you like it. 

## Videos
<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/Cx-JyJ9eXks?rel=0" frameborder="0" allowfullscreen></iframe>

## Documentation

[Learn more about **Stylable**](./docs/get-started.md) and get started with step by step instructions and code examples.

## Project

Access the BSD-licensed [**Stylable** GitHub project](https://github.com/wix/stylable).
