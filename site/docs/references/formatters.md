---
id: references/formatters
title: Formatters
layout: docs
---

Formatters are functions/methods for tranforming variables and returning a single CSS declaration value.

/*if below we're describing using formatters with variables as "advanced usage", maybe shouldn't be described in first paragraph for whole topic */

For example a `lighten` method that can turn any color to a lighter color.

**Stylable** supports all the formatters in [polished](https://polished.js.org/docs/). You will be able to import them from the `stylable-polished` repository (coming soon!). 

```js
/* ./calc-font-size.js */
    module.exports = function(baseSize, modifier) {
        switch (modifier) {
            case 'header':
                return `${Number(baseSize) * 2}px`;
            case 'aside':
                return `${Number(baseSize) * 0.75}px`; 
            default: 
                return baseSize + 'px';
        }
    };
```

```css
    :import {
        -st-from: "./calc-font-size";
        -st-default: calcFontSize;
    }

    .header {
        font-size: calcFontSize(16, case1);
    }

    .form {
        font-size: calcFontSize(16, case2);
    }
```

```css
    /* CSS output*/
    .header {
        font-size: 32px;
    }

    .form {
        font-size: 16px;
    }
```

## Advanced usage

You can use formatters with variables:

```css
    :import {
        -st-from: "./calc-font-size";
        -st-default: calcFontSize;
    }

    :vars {
        baseFontSize: 12px;
    }

    .header {
        font-size: calcFontSize(value(baseFontSize), header);
    }

    .form {
        font-size: calcFontSize(value(baseFontSize), body);
    }
```

```css
    /* CSS output*/
    .header {
        font-size: 24px;
    }
    .form {
        font-size: 12px;
    }
```

You can use nested formatters:


```css
    :import {
        -st-from: "./calc-font-size";
        -st-default: calcFontSize;
    }

    :import {
        -st-from: "./get-pi";
        -st-default: getPi;
    }

    .header {
        font-size: calcFontSize(getPi(10), header);
    }

    .form {
        font-size: calcFontSize(getPi(), body);
    }
```

```css
    /* CSS output*/
    .header {
        font-size: 31.41592653589793px;
    }
    .form {
        font-size: 3.141592653589793px;
    }
```

```js
/* ./get-pi.js */
    module.exports = function(multiplyBy = 1) {
        return Math.PI * multiplyBy;
    };
```


## Creating your own formatters

You can easily create new formatters using JavaScript or TypeScript.
For details, see [Extending through JS](./extending-through-js.md)