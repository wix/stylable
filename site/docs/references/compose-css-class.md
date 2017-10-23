---
id: references/compose-css-class
title: Compose CSS Class
layout: docs
---

Use `-st-compose` to apply a CSS class to another [CSS class](./class-selectors.md) or to a [tag selector](./tag-selectors.md).

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

```css
/* CSS output*/
.Comp__item { color: red }
.Comp__selected.Comp__item { color: green }
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

```css
/* CSS output*/
.Comp__item { color: red }
.Comp__round { border-radius: 10px }
.Comp__selected.Comp__item.Comp__round { color: green }
```
