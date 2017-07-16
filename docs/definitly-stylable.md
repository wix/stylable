# Definitely stylable

Use [custom selectors](./custom-selectors), [global selector](./global-selectors.md) and [custom pseudo-classes mapping](./pseudo-classes.md) to describe style interfaces for components that were not originally build with Stylable.

## Example

For a [BEM](http://getbem.com/) toggle button with icon component:
```html
<button class="btn"> /* potentially contain `.btn-toggled` class */
    <span class="btn__icon">
    <span class="btn__label">
<button>
```

### Interface stylesheet

A separate "interface" stylesheet can help describe a way to style it:
```css
/* external-toggle-button.css */
.root {/* ToDo: way to override root selector */
    -sb-states: toggled(".btn--toggled");
}
:--icon :global(.btn .btn__icon);
:--label :global(.btn .btn__label);
```

### Usage

Use like any other Stylable stylesheet to style:

CSS api:
```css
:import {
    -sb-from: "./external-toggle-button.css";
    -sb-default: ToggleBtn;
}
.my-btn { 
    -sb-extends: ToggleBtn;
    background: red;
}
.my-btn:toggled {
    background: green;
}
.my-btn::label {
    font-size: 20px;
}
```

CSS output:
```css
.root? { 
    background: red;
}
.root?.btn--toggled {
    background: green;
}
.root? .btn btn__label {
    font-size: 20px;
}
```


// add more cases... missing real-world CSS usage