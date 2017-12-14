# Formatters

Formatters are methods for tranforming variables and returning a css value for a declaration.

For example a "lighten" methods that turns colors to a lighter color.

Stylable supports all the formatters in [polished](https://polished.js.org/docs/) and you can import them from stylable-polished. 

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

You can easily create new formatters using javascript or typescript.
Further information available in [Extending through JS](./extending-through-js.md)