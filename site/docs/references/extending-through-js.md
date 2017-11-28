# Extending through JS

At stylable we love CSS and we love JS, we'd like them to get a room, on our build servers.

we also care about dev experience, so we everyone to be able to extend stylable while keeping completions and type checks.


## Plugin types:

stylable supports 2 types of plugins
* [formaters - methods for manipulating css values]('./formaters.md)
* [mixins - methods for generating css fragment for a selector]('./mixin-syntax.md)




## Stylable Types

Stylable types represent the available primitive types in CSS. They try to follow the spirit of the Houdini future spec. 

providing these types lets your plugin users get completions and validations when using them

Available types and validations:

| Type | validations |
|----|----|----|----|
|color| allow opacity | 
|sizeUnit| allowedUnits <br> min <br> max <br> multiplesOf | 
|percentage| min <br> max <br> multiplesOf | 
|image| allowBase64 <br> allowUrl | 
|number| min <br> max <br> multiplesOf | 
|enum| allowedValues
|lineStyle| blackList |
| display | blackList |
| bezierCurves | blackList |
|positionKeywords | blackList |
|repeatStyleKeywords | blackList |
|lineStyleKeywords | blackList |
|boxKeywords | blackList |
|geometryBoxKeywords | blackList |
|transitionTimingFunctions (without cubic-bezzier variants) | blackList |



Stylable uses Typescript or JSDocs to infer JS extension signatures

## Extending through formatters:

Formatters are JS methods manipulating parameters to produce a string value.


For example the following CSS code :

```css

:import{
    -st-from:"../my-formatter.js";
    -st-named:lighten;
    -st-default:fmt;
}

.myClass{
    color: lighten(30,#ff0000);
    background-color: fmt(80,#ff0000);
}

```

uses the following JS code:

```ts
/*my-formatter.js*/
import {darken  as polishedDarken, lighten as polishedLighten} from 'polished';
import {stNumber, stColor} from "stylable";
/**
* Lighten - lightens a color by a percentage.
*/
export function lighten(amount:stNumber,color:stColor):stColor{
    return polishedLighten(amount,color);
}

/**
* Darken - darkens a color by a percentage.
*/
export default function darken(amount:stNumber,color:stColor):stColor{
    return darken(amount,color);
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

you can also declare your parameters using JS docs.

here is the same mixin from above, written in js with js docs


```jsx

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

