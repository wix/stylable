---
id: references/tag-selectors
title: CSS Tag/Component Selector
layout: docs
---

Like CSS [type selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Type_selectors), **Stylable** `tag selectors` can match the names of elements in the DOM.

Tag selectors are **not** scoped themselves. Other selectors used with a tag selector can be scoped. For example if a [class selector](./class-selectors.md) is used with a tag selector, the class is scoped and the tag selector is not. The matching qualified name of a tag selector can therefore target any element in the subtree of the component. 

## Native element

Targeting a native element matches any element with the same tag name that is found in a prefix selector. The prefix selector could be a class selector or the root.

To target **all** elements of a certain type in your project, use a [`global selector`](./global-selectors.md).

```css
/* CSS */
@namespace "Page";
.root form { background: green; }
.sideBar:hover form { background: red; }
:global(span) { background: blue; }
```

```css
/* CSS output - form is not namespaced - affects any nested form */
.Page__root form { background: green; } 
.sideBar:hover form { background: red; }
span { background: blue; } /* this will affect *ALL* spans in your application */
```

> **Note**    
> The value `form` itself is not namespaced.

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
            <div className={style.root}>
                <div className={style.sideBar}>
                    <form /> /* green background and red while hovering parent */
                </div>
                <form /> /* green background */
                <span /> /* blue background */
            </div>
        );
    }
}
```

## Component element

When the value of a stylesheet is [imported](./imports.md) with a **capital first letter**, it can be used as a component tag selector.

```css
/* CSS */
@namespace "Page";
:import{
    -st-from: "./toggle-button.st.css";
    -st-default: ToggleButton;
}
.root ToggleButton { background: green; }
.sideBar:hover ToggleButton { background: red; }
```

```css
/* CSS output - ToggleButton is not namespaced - affects any nested toggle button */
.Page__root .ToggleButton__root { background: green; }
.sideBar:hover .ToggleButton__root { background: red; }
```


```js
/* comp.jsx */
import * as React from 'react';
import style from './comp.st.css';

/* React implementation - button component implements toggle-button.css */
import ToggleButton from './toggle-button';

class Comp {
    constructor(props) {
        super(props);
    }

    render () {
        return (
            <div className={style.root}>
                <div className={style.sideBar}>
                    <ToggleButton /> /* green background and red while hovering parent */
                </div>
                <ToggleButton /> /* green background */
            </div>
        );
    }
}
```
