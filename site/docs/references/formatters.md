---
id: references/formatters
title: Formatters
layout: docs
---

Formatters are functions/methods for tranforming variables and returning a single CSS declaration value.

/*if below we're describing using formatters with variables as "advanced usage", maybe shouldn't be described in first paragraph for whole topic */

For example a `lighten` method that can turn any color to a lighter color.

**Stylable** supports all the formatters in [polished](https://polished.js.org/docs/). You will be able to import them from the `stylable-polished` repository (coming soon!). 

```css
    :import{
        -st-from: "stylable-polished";
        -st-named: lighten;
    }

    .myBtn{
        color: lighten(#cc0000, 0.5);
    }
```

```css
    /* CSS output*/
    .myBtn{
        /* color after formatter change */
        color: #ee9999;
    }
```

## Advanced usage

You can use formatters with variables:

```css

    :import{
        -st-from: "stylable-polished";
        -st-named: lighten;
    }
    :vars{
        btnColor: #cc0000;
    }
    .myBtn{
        color: value(btnColor);
    }
    .myBtn:hover{
        color: lighten(value(btnColor), 0.5)
    }

```
```css
    /* CSS output*/
    .Page__myBtn{
        color: #cc0000;
    }
    .Page__myBtn:hover{
        color: #ee9999;
    }

```

You can define variables using formatters and use them in other formatters:

```css
    :import{
        -st-from: "stylable-polished";
        -st-named: lighten,darken;
    }
    :vars{
        btnColor: lighten(#ff0000, 0.5);
    }
    .myBtn{
        color: value(btnColor);
    }
    .myBtn:hover{
        color: darken(value(btnColor), 0.5)
    }
```

You can use nested formatters:


```css
    :import{
        -st-from:"stylable-polished";
        -st-named:lighten,darken;
    }
   
    .myBtn{
        color: lighten(darken(#ff0000,0.5), 0.5);
    }
```


## Creating your own formatters

You can easily create new formatters using JavaScript or TypeScript.
For details, see [Extending through JS](./extending-through-js.md)