# CSS Tag Selector

Like CSS [type selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors), **Stylable** `tag selectors` can match the qualified name of an element in the resulting DOM. You can use tag selectors to identify the value of imported components or stylesheets.

Tag selectors are **not** scoped themselves. The prefix selector around them is scoped normally and `root` is added to the beginning of the selector. *<Need clarification on this - isn't root what surrounds tag selector?>* The matching qualified name of a tag selector can therefore target any element in the subtree of the component. In the future we might add scoped tag selectors that will require additional integration with the view *<What view? DOM?>*.

## Native element

Targeting a native element in the same stylesheet matches any element with the same queried tag name that is found under the prefix selector:

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

To target another component that is rendered in the view,*<Again what view?>* the external component or stylesheet is [imported](./imports.md) and its value's name can be used as a tag selector:

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
/* namespaced to the stylesheet - .toggleButton_root is not namespaced */
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


