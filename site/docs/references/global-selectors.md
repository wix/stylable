---
id: references/global-selectors
title: Global Selectors
layout: docs
---

In **Stylable**, selectors are scoped to the stylesheet. But what if you want to target global or other selectors that are not scoped? You can use the `:global()` directive selector. 

In this example `.classB` and `.classC` are not scoped to `Comp` but are part of the selector query.

```css
/* CSS */
@namespace "Comp";
.classA :global(.classB > .classC) .classD:hover {
    color: red;
}
```

```css
/* CSS output*/
.Comp__root .Comp__classA .classB > .classC .Comp__classD:hover {
    color: red;
}
```

> **Note**   
>You can also use global to keep pseudo-classes native. You can describe them using the syntax below where `classA` is scoped and `:selected` is native.
>
> ```css
> .classA:global(:selected) {
>     color: red;
> }
> ```
