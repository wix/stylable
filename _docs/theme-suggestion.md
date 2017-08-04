This file lays out an example of how to theme an application using stylable

components used in this example:
( imported from a third party library )
* button
* textinput
* login form with ok and cancel buttons

## example assets

### button t.css
```css
.content{
  
}
.background{

}
```



### textinput t.css
```css
.input{
  
}
.background{

}
```


### login-form t.css
```css
:import{
  -st-default:TextInput;
  -st-from:"./text-input.t.css";
}
:import{
  -st-default:Button;
  -st-from:"./button.t.css";
}
.title{
}
.input{
  -st-extends:TextInput;
}
.ok{
  -st-extends:Button;
}
.cancel{
  -st-extends:Button;
}

```
### Theme.t.css
the theme file may include css for many components, only those acctualy required are added to the css (and written here)
```css
:import{
  -st-default:TextInput;
  -st-from:"./text-input.t.css";
}
:import{
  -st-default:Button;
  -st-from:"./button.t.css";
}
:import{
  -st-default:LoginForm;
  -st-from:"./login-form.t.css";
}
:vars{
  normal:'green';
  low:'gray';
  high: 'purple';
}
Button{
  //button default style
}
.cancelButton{
  -st-variant:true;
  -st-extends:Button;
  background:value(low);
}
.premuimButton{
  -st-variant:true;
  -st-extends:Button;
  background:value(high);
}

LoginForm{
  -st-extends:LoginForm;
  //login form  default style here
}
LoginForm::cancel{
  -st-mixin:cancelButton;
}

```




## example usage


### App with buttons:

app.t.css
```css
  :import{
    -st-default:Theme;
    -st-from="stylable-components/zagzag-theme.t.css"
  }
  :use(Theme){
    -st-use-variants:premuimButton
  }
```










