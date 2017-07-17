# CSS class Selectors

Defines the local names of internal component parts (e.g. `.button` of a menu component).

[CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) in Stylable are scoped to the [namespace](./namespace.md) of the stylesheet. And exported by name to reference the generated scoped value.

CSS API:
```css
.thumbnail{ background:green; }
.thumbnail:hover{ background:blue; }
.gallery:hover .thumbnail{ background:red; }
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.root .thumbnail{ background:green;}
.root .thumbnail:hover{ background:blue; }
.root .gallery:hover .thumbnail{ background:red; }
```

React
```jsx
/* inside a stylable render */
<div className="gallery">
    <img className="thumbnail" />
    ...
</div>
```

> `.root` is reserved for the (main root)[./root.md] in Stylable

> CSS class may define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).
