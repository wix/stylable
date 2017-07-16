# CSS class Selectors

[Normal CSS classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) are scoped to the stylesheet by Stylable.

ToDo: add general use explanation (class selectors do not effect anything automatically, they are used by the view/component to mark specific nodes with)

CSS API:

```css
.thumbnail{ background:green; }
.thumbnail:hover{ background:blue; }
.gallery:hover .thumbnail{ background:red; }
```
JS API:

```js
Stylesheet.fromCSS(`
  .thumbnail{ background:green; }
  .thumbnail:hover{ background:blue; }
  .gallery:hover .thumbnail{ background:red; }
`);
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

----------------





In the code example for [**root**](./root.md), GalleryRoot is 'namespaced' by using the syntax **.\<component name\>**.

You apply this syntax
to a specific node to reach it from outside and make it available to any level below it.

Here is a code example that demonstrates how each component under the class selector that has been 'namespaced' with a . (period) is now scoped *<ALR - still asking if this is the right term>*, shares its implemented type and is passed [BL: to what?] as the scoped CSS class.

In the example the CSS is importing from a file created for the Button component. It's using the Stylable default import (-sb-default) to import the default value from the button component.

#### CSS API:

```css
:import('<path to the file containing the component button>'){
    -sb-default: Button;
}
.myRoot{ -sb-root:true; }

.myButton {
    -sb-extends:Button;
    color: red;
}
```

#### JS API: [BL - thought JS API is now defunct?]

```js
import Button from 'components/button';
new Stylesheet({
    "@define:": {
        "myRoot": Stylesheet.root(),
        "myButton": Stylesheet.scoped(Button)
    },
    ".myButton": { color: "red" }
});
```

#### CSS output:

```css
.myRoot .myButton.Button { color: red; }
```
#### Possible markup (JSX)

```jsx
<form className="myRoot">
    <Label/> /* will not match `.myButton` */
    <Label className="myButton"/>
<form>
```
