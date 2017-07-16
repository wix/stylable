# Root

Every [Stylable stylesheet]() has a reserved class called root that targets the component root node. It should be placed on the root node of the component.

Need to refer to .root in the CSS for these 
* Give default styling and behavior to the component
* Extend another stylesheet
* Define pseudo-classes for the root of the component

> auto added to root in [react integration]() - no need to write `className="root"`

CSS API:
```css
.root{ background:red; } /* set component background to red */
```

CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.root{ background:red;}
```

> `.root` is reserved for the main root in Stylable

> `.root` is like any other stylable CSS class and may define [states]() and [extend another component]().
