# CSS class Selectors

[Normal CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) are scoped to the stylesheet by Stylable.

ToDo: add general use explanation (class selectors do not effect anything automatically, they are used by the view/component to mark specific nodes with)

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

> `.root` is reserved for the main root in Stylable [link]

> CSS class may define [states]() and [extend another component]().
