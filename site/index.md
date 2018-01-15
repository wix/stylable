---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults

id: welcome
# title: Welcome to Stylable - CSS for Components
redirect_from: "docs/index.html"
layout: docs
---

<span class="site-logo">![Stylable Intelligence](./branding/logo/PNG/96-logo-OnlySymbol.png)</span>
<h1 class="site-title">Stylable</h1>
<span class="site-description">is CSS for components</span>

<div class="hello-world">
  <div class="code">
    <span class="inner">
      <span class="class">
        <span class="comment"><b>/*</b>Some Component Stylesheet<b>*/</b></span>
        <span class="class-name"><b>.</b><span title="For Stylable, `.root` is the top layer of the component.">root</span></span><span class="open-bracket">{</span>
        <span class="break"></span>
        <span class="rule">
          <span class="prop prop-border"><span title="We can target logical states of the component by declaring them on the component's stylesheet.">-st-states</span><b>:</b></span>
          <span class="value" title="`loading` is just a state we're declaring. Just like that.">loading</span><span class="endrule">;</span>
        </span>
        <span class="rule">
          <span class="prop prop-border">border<b>:</b></span>
          <span class="value px">1px</span>
          <span class="value border-type">solid</span>
          <span class="value color border-color color-preview color-pink">pink</span><span class="endrule">;</span>
        </span>
        <span class="break"></span><span class="close-bracket">}</span>
      </span>
      <span class="class">
        <span class="class-name"><b>.</b>item</span><span class="open-bracket">{</span>
        <span class="break"></span>
        <span class="rule">
          <span class="prop prop-color">color<b>:</b></span>
          <span class="value color-preview color-gold">gold</span><span class="endrule">;</span>
        </span>
        <span class="break"></span><span class="close-bracket">}</span>
      </span>
    </span>
    <span class="caption">some-component.st.css</span>
  </div>

  <div class="code">
    <span class="inner">
      <span class="class">
        <span class="comment"><b>/*</b>Application Stylesheet<b>*/</b></span>
        <span class="class-name st-modifier"><b>:</b><span title="Stylable allows you to import component interfaces and match their inner parts, states and shared definitions like classes, variables, JS/CSS mixins and JS formatters.">import</span></span><span class="open-bracket">{</span>
        <span class="break"></span>
        <span class="rule">
          <span class="prop prop-border">-st-from<b>:</b></span>
          <span class="value file-path type-string"><b>"</b>./some-component.st.css<b>"</b></span><span class="endrule">;</span>
        </span>
        <span class="rule">
          <span class="prop prop-border">-st-default<b>:</b></span>
          <span class="value" title="Import `someComponent` to be used locally as a style type with a declared API.">SomeComponent</span><span class="endrule">;</span>
        </span>
        <span class="break"></span><span class="close-bracket">}</span><span class="endrule"></span>
      </span>
      <span class="class">
        <span class="class-name"><span title="Stylable exposes a clean, safe style API with code completions and validations."><span class="parent">SomeComponent</span><span class="child"><b>::</b>item</span></span></span><span class="open-bracket">{</span>
        <span class="break"></span>
        <span class="rule">
          <span class="prop prop-color">color<b>:</b></span>
          <span class="value color-preview color-blue">blue</span><span class="endrule">;</span>
          <span class="break"></span><span class="close-bracket">}</span>
        </span>
      </span>
      <span class="class">
        <span class="class-name"><span title="Stylable allows chaining selectors, so you can access the `::before` of the `::item` element, while the parent component is loading."><span class="parent">SomeComponent</span><span class="st-state"><b>:</b>loading</span><span class="child"><b>::</b>item</span><span class="pseudo"><b>::</b>before</span></span></span><span class="open-bracket">{</span>
        <span class="break"></span>
        <span class="rule">
          <span class="prop prop-content">content<b>:</b></span>
          <span class="value type-string"><b>"</b>*<b>"</b></span><span class="endrule">;</span>
          <span class="break"></span><span class="close-bracket">}</span><span class="endrule"></span>
        </span>
      </span>    
    </span>
    <span class="caption">app.st.css</span>
  </div>
</div>

We &hearts; CSS. Its simple, declarative syntax that is native in browsers is easily the fastest way to add styles to web pages and web apps. But when writing CSS that is scoped to individual components, developers have to maintain highly-specific selectors, using elaborate conventions to fake namespacing. Writing and maintaining CSS across large teams and large projects can be tricky.

We also &hearts; TypeScript. TypeScript helps us manage these large projects, exposing at build-time what we could once only see at run-time. 

We want to give CSS a _type system_ &mdash; to do for CSS what TypeScript does for JavaScript. We would like to be able to:

* **Extend CSS** so that it is easier to use in a component ecosystem, but without losing any of the declarative, familiar, static and fast aspects of CSS. 
* Create **CSS Macros** with JavaScript and use them at build time.
* Use language services like **Code Completion** and **Validation**. Each component exposes a Style API that maps its internal parts and states so you can reuse components across teams without sacrificing stylability or scalability.
* Provide the ability to see our **errors at build** time or even while [working in our IDE](https://marketplace.visualstudio.com/items?itemName=wix.stylable-intelligence). Wave goodbye to silent run-time breakage misery!

So we created **Stylable** &mdash; a CSS preprocessor that allows you to write style rules in CSS syntax, with some extensions that we believe adhere to the spirit of CSS.

## What Does Stylable Do?

* **Stylable** scopes styles to components so they don’t "leak" and clash with other styles.
* **Stylable** enables custom pseudo-classes and pseudo-elements that abstract the internal state and structure of a component. These can then be styled externally. For example, you can style the label inside a button, or style the play button of a video player from outside these components.
* **Stylable** sets themes so you can apply a different look and feel across your web application, for example, the same component can use a Wix theme or a Bootstrap theme depending on the page.
* At build time, the preprocessor converts the **Stylable** CSS into flat, static, valid, vanilla CSS that works cross-browser.

## Tooling

![Stylable Intelligence](./images/intelligence.gif)

Treating CSS as a type system opens up a whole new world of tooling. We can get code completion that hints at the internal structure of components, we can get types for our parameters, and more. Our aim is to use Stylable to enhance the styling development process.

To get the full Stylable experience, please install our [VSCode Code Completion Plugin](https://marketplace.visualstudio.com/items?itemName=wix.stylable-intelligence) which suggests Stylable syntax, types and more.

## Shut up and take my money!

No need! **Stylable** is BSD-licensed. Take it, use it, make your development easier and your apps faster.

Viva CSS, and welcome **Stylable**. We hope you like it. 

## Videos

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/Cx-JyJ9eXks?rel=0" frameborder="0" allowfullscreen></iframe>

## Documentation

[Learn more about **Stylable**](./docs/get-started.md) and get started with step by step instructions and code examples.

## Project

Access the BSD-licensed [**Stylable** GitHub project](https://github.com/wix/stylable).

<blockquote class="quote">
<p>New ideas will come along, but they will extend CSS rather than replace it. I believe that the CSS code we write today will be readable by computers 500 years from now.</p>
<small>&mdash; <a href="https://dev.opera.com/articles/css-twenty-years-hakon/">Håkon Wium Lie</a>, co-creator of CSS.</small>
</blockquote>
