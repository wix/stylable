# CSS Class Selectors

You use [CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) to define the local name of internal component parts, for example you can define `.button` in a menu component.

In **Stylable** class selectors are scoped to the [namespace](./namespace.md) of the stylesheet. 

CSS API:
```css
@namespace "S1"
.thumbnail{ background:green; }
.thumbnail:hover{ background:blue; }
.gallery:hover .thumbnail{ background:red; }
```

CSS OUTPUT:
```css
.S1__root .S1__thumbnail{ background:green;}
.S1__root .S1__thumbnail:hover{ background:blue; }
.S1__root .S1__gallery:hover .S1__thumbnail{ background:red; }
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

## Import classes

When importing a stylesheet, any class defined within it can be imported using `-st-named`.

## Usage
* [Compose CSS class](./compose-css-class.md)
* [Style pseudo-elements](./pseudo-elements.md)
