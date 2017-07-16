# Root

Every [Stylable stylesheet]() has a reserved class called root that targets the component root node. It should be placed on the root node of the component.

Refer to .root in this cases: 
* Give default styling and behavior to the component
* (Extend another stylesheet)[./extend-stylesheet.md]
* Define (pseudo-classes)[./pseudo-classes.md] for the root of the component

> auto added to root in [react integration](react-integration.md) - no need to write `className="root"`

CSS API:
```css
.root{ background:red; } /* set component background to red */
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.root{ background:red;}
```
