---
id: references/custom-selectors
title: Custom Selectors
layout: docs
---

You use [Custom selectors](https://drafts.csswg.org/css-extensions/#custom-selectors) to define a local name alias for complex selectors.

## Usage

The following code example demonstrate a `custom-selector` alias named `controlBtn` that matches any `.btn` CSS class nested under the `.controls` CSS class:

**CSS API**
```css
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

Custom selectors generate a [pseudo-element](./pseudo-elements.md), So for example [importing](./imports.md) the previous stylesheet into another stylesheet allows access to the `form-input` pseudo-element:

```css
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

> **Notice**:  
> In case a `custom-selector` alias conflicts with a local CSS class name, the exposed `pseudo-element` will target the `custom-selector`. However the the exported CSS class will still be exported to Javascript.

## Use cases

### Container and recursive components

Some components might contain nested instances of themselves, because they're a container or a "recursive" component (e.g. Tree component might render itself). 

In case the component exposes any `pseudo-elements`, it is a good practice to define them as `custom-selectors` with [child selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Child_selectors) to avoid effecting internal instances inner parts.

The following example show how a tree component exposes an icon:

```css
@namespace "Tree";
@custom-selector :--icon .root > .icon;
```

Using the icon `pseudo-selector` from the outside just like a CSS class selector:
```css
@namespace "Panel";
:import {
    -st-from: "./tree.st.css";
    -st-default: Tree;
}
/*
selector: .Panel__root .Tree__root > .Tree__icon
*/
Tree::icon {
    background: yellow;
}
```

### Expose deep inner parts

When you want to make some internal parts more accessible in your component API, you can simply describe `pseudo-elements` using `custom selectors`.

For example exposing a `pseudo-element` named `navigationBtn` that allow to style an internal gallery component `navBtn` element:
```css
:import {
    -st-from: "./gallery.st.css";
    -st-default: Gallery;
}
@custom-selector :--navigationBtn Gallery::navBtn;
```

### Combination selector

Sometimes a component has several basic CSS classes (with corresponding `pseudo-elements`) and we want to expose a combination `pseudo-element`.

For example a `pseudo-element` named `navBtn` will match any `btn` CSS class nested in a `nav` CSS class:
```css
@namespace "Comp";
@custom-selector :--navBtn .nav .btn;
```

```css
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

### Selectors group

In some cases you might want to gather up a collection of selectors into a single selector.

```css
@namespace "Comp";
@custom-selector :--symbol .icon, .thumb, .picture;
/*
selector: 
.Comp__root .Comp__icon, 
.Comp__root .Comp__thumb, 
.Comp__root .Comp__picture
*/
:--heading { 
    border: 1px solid grey; 
}
```

#### Caveats

Aliasing multiple selectors in a `custom-selector` is a [footgun feature](https://en.wiktionary.org/wiki/footgun#English) that might generate lots of CSS.

When we import the last example into another stylesheet it will split the selector for each override:

**CSS API**
```css
@namespace "Page";
:import {
    -st-from: "./comp.st.css";
    -st-default: Comp;
}
Comp::symbol { 
    border-color: red; 
}
```

**CSS OUTPUT**
```css
.Comp__root .Comp__icon, 
.Comp__root .Comp__thumb, 
.Comp__root .Comp__picture {
    border: 1px solid grey; 
}

.Page__root .Comp__root .Comp__icon, 
.Page__root .Comp__root .Comp__thumb, 
.Page__root .Comp__root .Comp__picture {
    border-color: red;
}
```
