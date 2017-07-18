# Root

Every [Stylable stylesheet]() has a reserved class called `root` that is applied to the component's root node.

You can do the following on the `root` class of the component:
* Apply default styling and behavior to the component. If you apply any kind of styling on the `root` class, it is cascaded down the component.
* (Extend another stylesheet)[./extend-stylesheet.md] *<Need an example of this>*
* Define (pseudo-classes)[./pseudo-classes.md] for the component. *<Need an example of this & is this the right place to talk about this?>*

## Examples

The `root` class is added automatically to root in [react integration](react-integration.md). No need to write `className="root"`.

CSS API:
```css
.root{ background:red; } /* set component background to red */
```

CSS OUTPUT:
```css
/* Namespaced to the stylesheet */
.root{ background:red;}
```
