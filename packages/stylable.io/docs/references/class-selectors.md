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
.root:hover .thumbnail { background:red; }
.thumbnail { background:green; }
.thumbnail:hover { background:blue; }
```

```css
/* CSS output*/
.Page__root:hover .Page__thumbnail { background:red; }
.Page__thumbnail { background:green;}
.Page__thumbnail:hover { background:blue; }
```

```js
/* comp.jsx */
import * as React from 'react';
import style from './comp.st.css';

class Comp {
    constructor(props) {
        super(props);
    }

    render () {
        return (
            <div { ...style('root', {}, this.props) }>
                <img className={style.thumbnail} />
            </div>
        )
    };
}
```

> **Note:**  
> In **Stylable**, as you can see in these examples, `.root` as a class name is reserved for the main [root](./root.md).  
> CSS class can also define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).

## Class selector export

Any class defined in a **Stylable** stylesheet is exported as a named export and can be imported by other stylesheets using the directive `-st-named`. These classes are also imported using the [react-integration](../getting-started/react-integration.md) and applied to the DOM as needed.

> **Note**:
> Classes imported this way should be scoped to your local stylesheet by adding `.root` or a local class as a prefix to the selector. Adding the scoping causes the selector to affect only the rendering subtree from this point onwards. If classes are imported without scoping to your local stylesheet, this may cause unexpected effects throughout your project.

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

/* @selector .Form__myIcon.Button__icon */
.myIcon { 
    -st-extends: icon; 
}

/* @selector .Form__root .Button__icon */
.root .icon {}

/* @selector .Form__label.Button__label */
.label {
    -st-extends: label;
}
```

```css
/* 
    JavaScript runtime exports:
    {
        root: "Form__root",
        myIcon: "Form__myIcon Button__icon",
        icon: "Button__icon",
        label: "Form__label Button__label"
    }
*/
```

## Usage

* [Style pseudo-elements](./pseudo-elements.md)
* [Use CSS mixins](./mixins.md)
