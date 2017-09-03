# CSS Class Selectors

You use [CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) to define the local name of internal component parts, for example you can define `.button` in a menu component.

In **Stylable** class selectors are scoped to the [namespace](./namespace.md) of the stylesheet. 

### CSS API:
```css
@namespace "Page"
.thumbnail { background:green; }
.thumbnail:hover { background:blue; }
.gallery:hover .thumbnail { background:red; }
```

### CSS OUTPUT:
```css
.Page__root .Page__thumbnail { background:green;}
.Page__root .Page__thumbnail:hover { background:blue; }
.Page__root .Page__gallery:hover .Page__thumbnail { background:red; }
```

### React:
```jsx
/* inside a stylable render */
<div className="gallery">
    <img className="thumbnail" />
    ...
</div>
```

> **Notes:**  
> In Stylable, as you can see in these examples, `.root` as a class name is reserved for the main [root](./root.md).  
> CSS class can also define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).

## Class Selector Export

Any class defined in a Stylable stylesheet is exported as a named export and can be imported by other stylesheets using the directive `-st-named`.

### Example

```css
/* button.st.css */
@namespace "Button"
.root { background:green; }
.icon { border: 2px solid black; } 
.label { font-size: 20px; } 
```

```css
/* form.st.css */
@namespace "Form"
:import {
    -st-from: './button.st.css';
    -st-named: icon, label; 
}
/* 
    @selector .Form__root .Form__my-icon.Button__icon 
    @export Form__my-icon Button__icon
*/
.my-icon { 
    -st-extends: icon; 
}
/* 
    @selector .Form__root .Button__icon 
    @export Button__icon
*/
.icon {}
/* 
    @selector .Form__root .Form__label.Button__label 
    @export Form__label Button__label
*/
.label {
    -st-extends: label;
}
```

## Usage

* [Compose CSS class](./compose-css-class.md)
* [Style pseudo-elements](./pseudo-elements.md)