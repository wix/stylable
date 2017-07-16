# CSS tag selector

Like CSS [type selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors), `tag selector` can match the qualified name of elements in the resulting DOM.

## Native element

Targeting a native element will match any element with the queried tag name that is found under the prefix selector:

CSS API:
```css
form{ background:green; }
.side-bar:hover form{ background:red; }
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.root form{ background:green;}
.root .side-bar:hover form{ background:red; }
```

React
```jsx
/* inside a stylable render */
<div className="gallery">
    <div className="side-bar">
        <form></form> /* green background and red while hovering parent */
    </div>
    <form></form> /* green background */
</div>
```

## Custom element [don't call it this; sounds liek Web Compnsents spec]

In order to match another stylesheet that is rendered in the componenet view, the external stylesheet can be targeted by [importing](./imports.md) it (or the component implementing the stylesheet) and using the imported name as the tag selector:

CSS API:

```css
:import{
    -sb-from: "./toggle-button.css";
    -sb-default: ToggleButton;
}
ToggleButton{ background:green; }
.side-bar:hover ToggleButton{ background:red; }
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.root .toggleButton_root{ background:green;}
.root .side-bar:hover toggleButton_root{ background:red; }
```

React
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

> **Note:**
> tag selectors are **not** scoped themselves. The prefix selector around them is scoped normally and root is added to the begining of the selector. So the matching qualified name of a tag selector may target any element in the subtree of the component.
