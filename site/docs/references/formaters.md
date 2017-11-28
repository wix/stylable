# Formaters

formaters are JS methods for tranforming variables.

for example a "lighten" methods that turns colors to a lighter color.

stylable supports all the formaters in "polished" ** add link ** and you can import them from stylable-polished.

```css

    :import{
        -st-from:"stylable-polished";
        -st-named:lighten;
    }

    .myBtn{
        color: lighten(#cc0000,0.5);
    }

```

```css
    /* CSS output*/
    .myBtn{
        /* color after formater change */
        color: #ee9999;
    }

```

## Advanced usage

you can use formaters with variables:

```css

    :import{
        -st-from:"stylable-polished";
        -st-named:lighten;
    }
    :vars{
        btnColor:#cc0000;
    }
    .myBtn{
        color: value(btnColor);
    }
    .myBtn:hover{
        color: lighten(value(btnColor),0.5)
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

you can define variables using formaters and use them in other formaters:


```css

    :import{
        -st-from:"stylable-polished";
        -st-named:lighten,darken;
    }
    :vars{
        btnColor:lighten(#ff0000,0.5);
    }
    .myBtn{
        color: value(btnColor);
    }
    .myBtn:hover{
        color: darken(value(btnColor),0.5)
    }

```

you can use nested formaters:


```css

    :import{
        -st-from:"stylable-polished";
        -st-named:lighten,darken;
    }
   
    .myBtn{
        color: lighten(darken(#ff0000,0.5), 0.5);
    }

```


## creating your own formaters

you can easily create new formaters using javascript or typescript
[read more in extending through js](./extending-through-js.md)