# CSS tag selector

Like CSS [type selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors), `tag selector` can matches the name of elements in the resulting DOM.

> **Note:**
> tag selectors are **not** scoped themselves. The prefix selector around them is scoped normally and root is added to the beginning of the selector. So the matching qualified name of a tag selector may target any element in the subtree of the component. In the future we might add scoped tag selector that will require additional integration with the view.

## Native element


CSS API:

```css
form {background:green;}
```

CSS OUTPUT:

```css
/*  form is not namespaced */
.root form {background:green;} 
```

Targeting a native element will match any element with the queried tag name that is found under the prefix selector:

CSS API:

```css
form{ background:green; }
.side-bar:hover form{ background:red; }
```

CSS OUTPUT:

```css
/* namespaced to the stylesheet - form is not namespaced */
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

## Component element

In order to target another component that is rendered in the view, the external component (stylesheet) is [imported](./imports.md) and its name can be used as a tag selector:

CSS API:

```css
:import{
    -sb-from: "./toggle-button.css";
    -sb-default: ToggleButton;
}
ToggleButton {background:green;}
.side-bar:hover ToggleButton {background:red;}
```

CSS OUTPUT:

```css
/* namespaced to the stylesheet - .toggleButton_root is not namespaced */
.root .toggleButton_root {background:green;}
.root .side-bar:hover toggleButton_root {background:red;}
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


