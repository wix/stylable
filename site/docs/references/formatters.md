---
id: references/formatters
title: Formatters
layout: docs
---

Formatters are functions that return a single CSS declaration value. They can receive arguments, process them and return the value.

For example a `font-size` formatter can return a different value for the font size depending on the location.


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

>**Note**  
>Currently you cannot use formatters inside a native URL function. As a suggested workaround, you can return a URL function from a formattter.


## Formatters with variables

You can use formatters with variables. 

In this example the CSS imports the same formatter as the previous example, `cal-font-size`, but the variable `baseFontSize` is added to the calculation.  

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

## Nested formatters

You can use nested formatters. 

In this example the formatter `get-pi` is nested in the `cal-font-size` formatter described above. Both are imported into the CSS file and the output values are calculated from both.

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
