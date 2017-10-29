---
id: references/compose-css-class
title: Compose CSS Class
layout: docs
---


Use `-st-compose` as a way to automatically connect between two or more style classes so that if one is used, the DOM element will receive the composed classes as well.

For example:
```css
/* CSS */
@namespace "Comp";
.item {
    color: red;
}
.special {
    -st-compose: item;
    color: green;
}
```
In the above stylesheet, anyone using `style.special` automatically gets both `special` and `item` classes applied.

The output JS mapping for the above is:
```js
/* JS */
{
    item: "Comp__item",
    special: "Comp__special Comp__item"
}
```

## Multiple classes

You can compose multiple classes.

```css
/* CSS */
@namespace "Comp";
.item {
    color: red;
}
.round {
    border-radius: 10px;
}
.special {
    -st-compose: item, round; /* pass multiple classes */
    color: green;
}
```

```js
/* JS */
{
    item: "Comp__item",
    round: "Comp__round",
    special: "Comp__special Comp__item Comp__round"
}
```
