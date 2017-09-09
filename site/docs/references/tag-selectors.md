---
id: references/tag-selectors
title: CSS Tag Selector
layout: docs
---

Like CSS [type selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors), **Stylable** `tag selectors` can match the names of elements in the DOM.

Tag selectors are **not** scoped themselves. Other selectors used with a tag selector can be scoped. For example if a [class selector](./class-selectors.md) is used with a tag selector, the class is scoped and the tag selector is not.  [Root](./root.md) is always added and is always scoped. The matching qualified name of a tag selector can therefore target any element in the subtree of the component. 

> **Note**: In the future we may add scoped tag selectors which will require Stylable to include additional [DOM integration](./react-integration.md). 

## Native Element

Targeting a native element matches any element with the same tag name that is found in a prefix selector. The prefix selector could be a class selector or the root.

**CSS API**
```css
@namespace "Page"
form { background: green; }
.side-bar:hover form { background: red; }
```

**CSS OUTPUT**
```css
/* form is not namespaced - affects any nested form */
.Page__root form { background: green; } 
.Page__root.side-bar:hover form { background: red; }
```

> **Note**:  
> `form` is not namespaced.

**React**
```jsx
/* inside a stylable component render */
<div className="gallery">
    <div className="side-bar">
        <form></form> /* green background and red while hovering parent */
    </div>
    <form></form> /* green background */
</div>
```

## Component Element

When the value of a stylesheet is [imported](./imports.md) with a **capital first letter**, it can be used as a component tag selector.

**CSS API**
```css
@namespace "Page"
:import{
    -st-from: "./toggle-button.st.css";
    -st-default: ToggleButton;
}
ToggleButton { background: green; }
.side-bar:hover ToggleButton { background: red; }
```

**CSS OUTPUT**
```css
/* ToggleButton is not namespaced - affects any nested toggle button */
.Page__root .ToggleButton__root { background: green; }
.Page__root .Page__root.side-bar:hover .ToggleButton__root { background: red; }
```

**React Implementation**
```jsx
/* Button component implements toggle-button.css */
import ToggleButton from './toggle-button';
/* inside a stylable render */
<div className="gallery">
    <div className="side-bar">
        <ToggleButton></ToggleButton> /* green background and red while hovering parent */
    </div>
    <ToggleButton></ToggleButton> /* green background */
</div>
```
