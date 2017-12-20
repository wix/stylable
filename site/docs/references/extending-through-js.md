---
id: references/extending-through-js
title: Extend Through JavaScript
layout: docs
---

While **Stylable** is a CSS pre-processor, developers can extend their **Stylable** definitions utlizing CSS, JavaScript or both while maintaining code hinting and type checking for validations.

/* why? */
Enables developers greater freedom in generating CSS from code to provide ease of use, consistency and efficient management of complex CSS-based patterns. 

## Plugin types

 **Stylable** supports the following types of plugins:
* [Formatters]('./formatters.md) - functions for manipulating single CSS declaration values.
* [Mixins]('./mixin-syntax.md) - functions for generating a CSS fragment that can include single or multiple rulesets and declarations. 

**Stylable** offers the types described here as the provided arguments for the plugins. For example: 

```ts
function lighten(amount: number, color: color) {
    ...
}
```

## Stylable types

**Stylable** types represent the available primitive types in CSS. They follow the spirit of the [Houdini](https://github.com/w3c/css-houdini-drafts/wiki) future spec. 

Using these types enables the consumers of the plugin to receive code hinting and type checking for validations.

**Stylable** uses TypeScript or JSDocs to infer JS extension signatures.

### Available types and validations

| Type | Validations | Validation Type |
|----|----|----|
| color | allowOpacity: boolean  | 
| sizeUnit | allowedUnits, min, max, multiplesOf | string[], number, number, number  | 
| percentage | min, max, multiplesOf | number, number, number | 
| image | allowBase64, allowUrl | boolean |
| number | min, max, multiplesOf | numbers |
| enum | allowedValues | string[] |

The following types are native enums that can appear in native CSS. **Stylable** enables you to create custom black lists for the enum value. 

| Type | Validations |
|----|----|
| lineStyle | blackList |
| display | blackList |
| bezierCurves | blackList |
| positionKeywords | blackList |
| repeatStyleKeywords | blackList |
| lineStyleKeywords | blackList |
| boxKeywords | blackList |
| geometryBoxKeywords | blackList |
| transitionTimingFunctions (without cubic-bezzier variants) | blackList |

/* remove table - keep list & add code sample w/ "blackList" */


## Extending through formatters

Formatters are methods that manipulate parameters to produce a string that is returned as a single declaration value.


For example the following CSS code:

```css

:import {
    -st-from: "../my-formatter.js";
    -st-named: lighten;
    -st-default: frmt;
}

.myClass {
    color: lighten(30, #ff0000);
}

```

Uses the following TypeScript code:

```ts
/*my-formatter.ts*/

import {darken as polishedDarken, lighten as polishedLighten} from 'polished';
import {stNumber, stColor} from "stylable";


/**
 * Lighten - lightens a color by a percentage.
*/
export function lighten(amount: stNumber, color: stColor): stColor {
    return polishedLighten(amount, color);
}
```

## Extending through mixins

In many cases its useful to generate bigger chunks of css through js.
Here's an example creating and using an expandOnHover mixin:

```css

:import{
    -st-from:"../my-mixins.js";
    -st-named:expandOnHover;
}

.myClass{
    -st-mixin:expandOnHover(200,2);
}

```


```ts
import {stNumber, stColor, stCurves, stCssFragment} from "stylable";

/**
* Expand
*/
export function expandOnHover( durationMS:stNumber<0,1000> = 200,
                               increaseBy:stNumber = 1.5,
                               animationCurve:stCurves = 'easeIn'):stCssFragment{
    return {
        transition:"all "+duration+"ms "+animationCurve;,
        ":hover":{
            transform:scale(increaseBy)
        }
    }
}

```


## Declaring types through JS docs

You can also declare your parameters using JS docs.
Here is a the same formatter and mixin from above, written in js with JS docs.


```jsx

/**
 * Lighten - lightens a color by a percentage.
*/
/**
 * Lightens a color by an amount.
 * @constructor
 * @param {string} amount - Amount to lighten
 * @param {string} color - Color to be lightened
*/
export function lighten(amount, color) {
    return polishedLighten(amount, color);
}

/**
* Expand
* @param {stNumber<0,1000>} [durationMS=200] - total animation time MS
* @param {stPercentage} [increaseBy=1.5] - how much to increase size;
* @param {stCurves} [animationCurve=cubicEaseIn] - animation change over time curve
* @returns {stCssFragment}
*/
export function expandOnHover(durationMS,increaseBy,animationCurve){
    return {
        transition:"all "+duration+"ms "+animationCurve;,
        ":hover":{
            transform:scale(increaseBy)
        }
    }
}

```

