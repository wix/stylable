---
id: guides/runtime
title: Runtime
layout: docs
---

Imported **Stylable** stylesheets contain minimal runtime code to help define the structure and state of the component.

```css
/* style.st.css */
.root {
    -st-states: selected;
}
.label {}
.icon {}
```

```javascript
/* index.jsx */
import style from "style.st.css"; // import stylesheet's runtime API
```

## Manual mapping

CSS class names, defined in the stylesheet, are exposed directly on the import reference and mapped to their runtime target value. The expected class name is then used as an element class name in the structure.

```javascript
style.root // "style__root"
style.label // "style__label"
style.icon // "style__icon"
```

> **Note**  
> The [root class](../references/root.md) is available even when it is not defined in the stylesheet. 

## Custom state mapping

[Custom states](../references/pseudo-classes.md), which can be targeted from the style, are generated using the `$cssStates` function. The function accepts a map of local state names and generates an object with `data-*` attributes used to mark the element state.

```javascript
/* { 'data-style-selected':true } */
style.$cssStates({ selected:true })
/* { 'data-style-unknownstate':true } */
style.$cssStates({ unknownState:true })

/* { } */
style.$cssStates({ selected:false }) // no states

/* { 'data-style-a':true, 'data-style-b':true } */
style.$cssStates({ a:true, b:true }) // multiple
```

## Generate element attributes

The minimal runtime provides a function to help with component definition.  
Calling the function returns an object describing the attributes of a node in the component view.

### Element name

The first argument represents the name of the element, and returns a `className` attribute to mark the element node.

```javascript
/* { className:'style__root' } */
style('root') 
/* { className:'style__label' } */
style('label') 

/* { className:'style__label style__icon' } */
style('label icon') // multiple markings
```

> **Note**  
> Any class name that is not found in the stylesheet is not namespaced and is treated as global.

### Custom states

The second argument represents the [custom state](#custom-state-mapping), and returns a `data-*` attribute to represent the custom state on the element.

```javascript
/* { className:'style__root', 'data-style-selected':true } */
style('root', { selected:true })
/* { className:'style__root', 'data-style-searched':true } */
style('label', { searched:true })
```

### Merge props

The third argument can be used as a base for the generated class name and states.

```javascript
/*  { className:'style__root class-a' } */
style('root', {}, { className:'class-a' })
/*  { className:'style__root label icon' } */
style('root', {}, { className:'label icon' }) // appended without namespacing

/*  { className:'style__root', 'data-a':true } */
style('root', {}, { 'data-a':true })
```

> **Note**  
> Any `data-*` attribute passed in the base overrides its generated equivalent.
