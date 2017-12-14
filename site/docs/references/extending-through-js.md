# Extending through JS

Here at **Stylable** we love CSS and we love JS, we'd like them to get a room together, on our build servers.

We also care about dev experience and so we want everyone to be able to extend Stylable while maintaining completions and type checking.

## Plugin types:

Stylable supports 2 types of plugins
* [Formatters - methods for manipulating css declaration values]('./formatters.md)
* [Mixins - methods for generating a css fragment]('./mixin-syntax.md)

## Stylable Types

Stylable types represent the available primitive types in CSS. They try to follow the spirit of the [Houdini](https://github.com/w3c/css-houdini-drafts/wiki) future spec. 

Utilizing these types enables the consumers of the plugin to receive completions and validations in their consumption.

### Available types and validations:

| Type | validations |
|----|----|
| color | allow opacity | 
| sizeUnit | allowedUnits, min, max, multiplesOf | 
| percentage | min, max, multiplesOf | 
| image | allowBase64, allowUrl | 
| number | min, max, multiplesOf | 
| enum | allowedValues |

Native Enums

| Type | validations |
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



> Note: Stylable uses Typescript or JSDocs to infer JS extension signatures

## Extending through formatters:

Formatters are methods that manipulate parameters in order to produce a string that will be returned to a declaration value.


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

## Extending through mixins:

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
export function lighten(amount: stNumber, color: stColor): stColor {
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

