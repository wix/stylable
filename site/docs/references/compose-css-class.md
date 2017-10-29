---
id: references/compose-css-class
title: Compose CSS Class
layout: docs
---

Use `-st-compose` to influence the local export name of a class selector. It applies a CSS class to another CSS [class](./class-selectors.md). It does not affect the CSS output. It affects the JavaScript module output by concatenating the class mapping so multiple classes are output as one key. 

```css
/* CSS */
@namespace "Comp";
.item {
    color: red;
}
.selected {
    -st-compose: item;
    color: green;
}
```

```js
/* JS */
{
    item: "Comp__item",
    selected: "Comp__selected Comp__item"
}
```

## Multiple classes

You can compose multiple classes or tag selectors by order.

```css
/* CSS */
@namespace "Comp";
.item {
    color: red;
}
.round {
    border-radius: 10px;
}
.selected {
    -st-compose: item, round; /* pass multiple classes */
    color: green;
}
```

```js
/* JS */
{
    item: "Comp__item",
    round: "Comp__round",
    selected: "Comp__selected Comp__item Comp__round"
}
```
