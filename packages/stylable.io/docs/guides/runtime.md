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
/* index.jsx - stylesheet's runtime api */
import { 
    style,    // runtime utility function 
    st,       // alias for the style function above
    classes,  // class names mapping
    vars,     // css variables mapping
    stVars,   // stylable build-time variable values
    cssStates // utility function for setting stylable states
}  from "style.st.css";
```

## Manual mapping

CSS class names, defined in the stylesheet, are exposed on the imported `classes` reference and mapped to their runtime target value. The expected class name is then used as an element class name in the structure.

```javascript
classes.root  // "style__root"
classes.label // "style__label"
classes.icon  // "style__icon"
```

> **Note**  
> The [root class](../references/root.md) is available even when it is not defined in the stylesheet. 

## Custom state mapping

[Custom states](../references/pseudo-classes.md), which can be targeted from the style, are generated using the `cssStates` function. The function accepts a map of local state names and generates string with concatenated class names used to mark the element state.

```javascript
/* { 'data-style-selected':true } */
cssStates({ selected:true })
/* { 'data-style-unknownstate':true } */
cssStates({ unknownState:true })

/* { } */
cssStates({ selected:false }) // no states

/* { 'data-style-a':true, 'data-style-b':true } */
cssStates({ a:true, b:true }) // multiple
```

### Element name

The first argument represents the scoped name of the element, and passes through the received class name.

```javascript
/* 'style__root'  */
style(classes.root) 
/* 'style__label' */
style(classes.label) 

// multiple markings
style(classes.label, classes.icon) 
/* 'style__label style__icon' */

// string pass-through
style('root') 
/* 'root' */
```

> **Note**  
> Stylable no longer performs auto-scoping for classes, and strings are passed as-is. Use the `classes` mapping object to resolve to the scoped class name.

### Custom states

The second argument represents the [custom state](#custom-state-mapping) (or another class), and returns a class to represent every custom state on the element.

States are optional and the second argument can be replaced with another className if needed.

```javascript
/* 'style__root style--selected' */
style(classes.root, { selected:true })
/* 'style__label style--searched' */
style(classes.label, { searched:true })

/* 'style__label style__icon' */
style(classes.label, classes.icon)
```

### Merge props

The third argument (and any arguments after) can be used for any additional classes that need to be applied to the element. In a component root node, it is recommended to pass along the `className` prop received through your parent component as props.

```js
// this.props.className = 'app__root app--selected'
/*  'style__root app__root app--selected' */
style(classes.root, this.props.className)

/*  'style__root label icon' */
style(classes.root, 'label', 'icon') // label and icon are global (un-scoped)

/*  'style__root style--selected' */
style(classes.root, 'style--selected')
```
