# CSS Tag Selector

Like CSS [type selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors), **Stylable** `tag selectors` can match the names of elements in the DOM.

Tag selectors are **not** scoped themselves. Other selectors used with a tag selector can be scoped. For example if a [class selector](./class-selectors.md) is used with a tag selector, the class is scoped and the tag selector is not.  [Root](./root.md) is always added and is always scoped.  The matching qualified name of a tag selector can therefore target any element in the subtree of the component. 

> **Note**: In the future we may add scoped tag selectors which will require Stylable to include additional [DOM integration](./react-integration.md). 

## Native element

Targeting a native element matches any element with the same tag name that is found in a prefix selector. The prefix selector could be a class selector or the root.

CSS API:

```css
form {background:green;}

```

CSS OUTPUT:

```css
/* form is not namespaced */
.root form {background:green;} 
```

CSS API:

```css
form {background:green;}
.side-bar:hover form {background:red; }
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet - form is not namespaced */
.root form {background:green;} 
.root .side-bar:hover form {background:red; }
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

When a stylesheet is [imported](./imports.md) with a **capital first letter** it can be used as a component tag selector

CSS API:
```css
:import{
    -st-from: "./toggle-button.css";
    -st-default: ToggleButton;
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


