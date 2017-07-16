# Definitely stylable

Use (custom selectors)[./custom-selectors] to describe style interfaces for components that were not originally build with Stylable.

## Example

// find more examples...

For a [BEM](http://getbem.com/) toggle button with icon component:
```html
<button class="btn">
    <span class="btn__icon">
    <span class="btn__label">
<button>
```

A separate "interface" stylesheet can help describe a way to style it:
```css
:--icon .btn .btn__icon;
:--label .btn .btn__label;
```
