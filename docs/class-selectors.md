# CSS Class Selectors

You use [CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) to define the local name of internal component parts, for example you can define `.button` in a menu component.

In **Stylable** class selectors are scoped to the [namespace](./namespace.md) of the stylesheet. You can also use the class name to export the value generated in the scope of the stylesheet.

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
Notes:
> In Stylable, as you can see in these examples, `.root` as a class name is reserved for the main [root](./root.md).

> CSS class can also define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).
