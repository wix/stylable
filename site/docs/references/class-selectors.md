---
id: references/class-selectors
title: CSS Class Selectors
layout: docs
---

You use [CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) to define the local name of internal component parts. For example, you can define a `.button` in a menu component.

In **Stylable**, class selectors are scoped to the [namespace](./namespace.md) of the stylesheet. 

You should use camelCase to name class selectors. Avoid using hyphens (-) and capital first letters.

```css
/* CSS */
@namespace "Page";
.thumbnail { background:green; }
.thumbnail:hover { background:blue; }
.gallery:hover .thumbnail { background:red; }
```

```css
/* CSS output*/
.Page__root .Page__thumbnail { background:green;}
.Page__root .Page__thumbnail:hover { background:blue; }
.Page__root .Page__gallery:hover .Page__thumbnail { background:red; }
```

```jsx
/* React - inside a stylable render */
<div className="gallery">
    <img className="thumbnail" />
    ...
</div>
```

> **Note:**  
> In **Stylable**, as you can see in these examples, `.root` as a class name is reserved for the main [root](./root.md).  
> CSS class can also define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).

## Class selector export

Any class defined in a **Stylable** stylesheet is exported as a named export and can be imported by other stylesheets using the directive `-st-named`.

### Example

```css
/* button.st.css */
@namespace "Button";
.root { background:green; }
.icon { border: 2px solid black; } 
.label { font-size: 20px; } 
```

```css
/* form.st.css */
@namespace "Form";
:import {
    -st-from: './button.st.css';
    -st-named: icon, label; 
}
/* 
    @selector .Form__root .Form__myIcon.Button__icon 
    @export Form__myIcon Button__icon
*/
.myIcon { 
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
