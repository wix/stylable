---
id: references/custom-selectors
title: Custom Selectors
layout: docs
---

You use [custom selectors](https://drafts.csswg.org/css-extensions/#custom-selectors) to define an alias that can match complex selectors. 

For example, a specific type of button within a form that appears only when hovered can be defined as a custom selector. By defining the button as a custom selector with its own name, the button is exposed in the API and available for use by using just the custom selector name.

You could also use custom selectors to define a group of selectors with one name. For example, you can access all the headings on a page as one custom selector. This could be useful if you want to style just their color the same.

## Usage

The following code maps the alias name `controlBtn` that matches any `.btn` CSS class nested under the `.controls` CSS class.

****
```css
/* CSS */
@namespace "Comp";
@custom-selector :--controlBtn .controls .btn;
/* 
selector: .Comp__root .Comp__controls .Comp__btn 
*/
:--controlBtn { border: 1px solid grey; }
/* 
selector: .Comp__root .Comp__controls .Comp__btn:hover 
*/
:--controlBtn:hover { border-color: red; }
```

### Expose pseudo-element

Custom selectors generate a [pseudo-element](./pseudo-elements.md). So, for example, [importing](./imports.md) a stylesheet into another stylesheet enables access to the `controlBtn` pseudo-element. In this example, the stylesheet `comp.st.css` from the previous example is imported into this stylesheet.

```css
/* CSS */
@namespace "Page";
:import {
    -st-from: "./comp.st.css";
    -st-default: Comp;
}
/*
selector: .Page__root .Comp__root .Comp__controls .Comp__btn
*/
Comp::controlBtn { 
    background: gold; 
}
```

> **Note**:    
> If a `custom-selector` alias conflicts with a local CSS class name, the exposed `pseudo-element` targets the `custom-selector`. However, the exported CSS class is still exported to JavaScript.

## Use cases

The following examples demonstrate how to effectively use custom selectors in **Stylable**.

### Container and recursive components

Some components might contain nested instances of themselves because they're a container or a "recursive" component. For example, a tree component might render itself. 

If the component exposes any `pseudo-elements`, it is a good practice to define them as `custom selectors` with [child selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_selectors) to avoid affecting the inner parts of internal instances.

The following example shows how a tree component exposes an icon.

```css
/* CSS */
@namespace "Tree";
@custom-selector :--icon .root > .icon;
```

Here you can use the icon `custom selector` from the outside just like you would use any other `pseudo-element`.

```css
/* CSS */
@namespace "Panel";
:import {
    -st-from: "./tree.st.css";
    -st-default: Tree;
}
/*
selector: .Panel__root .Tree__root > .Tree__icon
*/
Tree::icon {
    background: yellow;  /* paints the icons all the way down the tree */
}
```

### Expose inner parts that are deeply defined

When you want to make internal parts of your component API more accessible, you can describe `pseudo-elements` using `custom selectors`.

For example, you can expose a `pseudo-element` named `navigationBtn` that enables you to style an internal gallery component's `navBtn` element.

```css
/* CSS */
:import {
    -st-from: "./gallery.st.css";
    -st-default: Gallery;
}
@custom-selector :--navigationBtn Gallery::navBtn;
```

### Combination selector

You may have a component with several basic CSS classes and with corresponding `pseudo-elements`. You could expose a combination `pseudo-element`.

For example, a `pseudo-element` named `navBtn` matches any `btn` CSS class nested in a `nav` CSS class.

```css
/* CSS */
@namespace "Comp";
@custom-selector :--navBtn .nav .btn;
```

```css
/* CSS */
@namespace "Page";
:import {
    -st-from: "./comp.st.css";
    -st-default: Comp;
}
/*
selector: Page__root .Comp__root .Comp__nav .Comp__btn
*/
Comp::navBtn { 
    border: 1px solid grey; 
}
```

### Group of selectors

You could also use custom selectors to gather a collection of selectors into a single selector. For example, you may want to access media that includes both images and videos.

```css
/* CSS */
@namespace "Comp";
@custom-selector :--media .image, .video;
/*
selector: 
.Comp__root .Comp__image, 
.Comp__root .Comp__video 
*/
:--media { 
    border: 1px solid grey; 
}
```

#### Issues to consider

Aliasing multiple selectors in a `custom selector` may generate lots of CSS that could affect performance.

For example, when you import the `Comp` stylesheet (the selector described in the previous example) into another stylesheet, in the ouput the selector is split for each override.

```css
/* CSS */
@namespace "Page";
:import {
    -st-from: "./comp.st.css";
    -st-default: Comp;
}
Comp::media { 
    border-color: red; 
}
```

```css
/* CSS Output */
.Comp__root .Comp__image, 
.Comp__root .Comp__video {
    border: 1px solid grey; 
}

.Page__root .Comp__root .Comp__image, 
.Page__root .Comp__root .Comp__video {
    border-color: red;
}
```
