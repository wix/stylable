---
id: guides/stylable-component-best-practices
title: Stylable Component - Best Practices
layout: docs
---

One of the goals of a stylable-component is to be easily stylable / themable from the outside. This means that the stylesheet describing the component CSS should be as **simple** and **generic** as possible. 

## Component root

Since our stylesheet represent a component that should be flexible and play nice by default with other elements on the page, in most cases it should have `display:inline-block` or `display:inline-flex` and avoid setting `position`. 

## Size

Try avoiding size declaration, because it offers an easier API for an owner component to override, However when setting a default size or size limitations use `em` units to resize to the html context.

## Specificity

Write low specificity selectors that will be easy to override from a parent component.

## Internal parts

Any CSS class selector can be targeted from the outside as a `pseudo-element` and should be considered part of the component API. Expose meaningful class names that will make sense as part of a selector:

```css
/* good */
Gallery::navBtn::label {} /* camelCase with clear pseudo-element names  */

/* bad */
Gallery::galleryNavBtn {} /* don't reuse component id */
Gallery::nav-btn {} /* don't use kebab-case - stylable exports JS */
```

## Global CSS

Try to avoiding global related selectors like `@media` or matching DOM outside of the component scope like `body`.

[Tag selectors](../references/tag-selectors.md) should be avoided inside a component, as they effect any nested component or element unless specifically targeting the tag with **child selector** (e.g. `.root > p`) and not a **descendent selector** (e.g. `.root p`).

## Layout

Internal structure demands some CSS in order to work correctly. Try to find the minimal combination of CSS to make the component layout work as it should.

## Visibility

Component stylesheet should describe the bare minimum, and colors should be used sparsely just to achieve visibility without any outside styling. Best practice is to use 2 colors across the project for contrast text and background.

```css
@namespace "dropdown";
.options { 
    background: value(color1); 
    color: value(color2); 
}
```

> **Note**:
> We might want to implement stylable formatters to help minimize the amount of colors needed in a color scheme:  
> ```css
> .options { 
>    background: darker(value(color1), 0.5); 
>    color: lighter(value(color2)); 
>}
> ```

## Override browser defaults

Browsers add a default UA stylesheets to provide the HTML with default "style". 

It is tempting to cleanup a `button` default style in the component, but we want our component to "blend" in the context it is used in. A button tag in our component should look like other button tags in the context application so set CSS only for behaviors that **must** be overridden in order for the component to function.

## Composability

Similar to browser default, we want to allow the context application to style the component internals. 

Override CSS only for behaviors that **must** be overridden in order for the component to function and minimize usage of `tag selectors` and `pseudo-elements` of nested components. 

When a component customize its internal DOM parts, it generates selectors with high specificity that make it hard to style from the outside:

```css
@namespace "comp";
/* 
> directly style navBtn - a type of button
selector: .comp__root .comp__gallery.gallery__root .gallery__navBtn
specificity: 0,0,4,0 
*/
.gallery::navBtn {} 
```
```css
@namespace "page";
/* 
> less specific then component override 
selector: .page__root button
specificity: 0,0,1,1
*/
button {} 
```

## Comments

A good way to validate minimal CSS is to add comments. There should be a 1-5 words clarifying why a certain declaration or ruleset combination is found in the stylesheet.

```css
.root {
    /* mouse click hint */
    cursor: pointer;
}
.link {
    /* override UA style */
    color: currentColor;
    /* cover entire line */
    display: block;
}
```

This helps with maintenance and development, since we don't test CSS as thoroughly as other code.

## Variables

Import theme variables from the [project commons stylesheet](../guides/project-commons.md):

```css
:import {
    -st-from: "./project.st.css";
    -st-named: color1;
}
.item {
    background: value(color1);
}
```

## Images and svg

When using image element source or svg directly in the DOM, it is not easy and in some cases not possible to modify the asset from outside the component using CSS.

When asset is part of the style API, it should be placed in the background of an element, Allowing background to be overridden from a parent component.

It is not encouraged to use `::before` and `::after` if possible, because they are generic and hard to override.