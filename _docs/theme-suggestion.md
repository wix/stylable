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
  outline: blue;
  normal:green;
  low:gray;
  high:purple;
}
Button{
  outline:value(outline);
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
  //login form  default style here
}
LoginForm::cancel{
  -st-mixin:cancelButton;
}

.loginForVariant{
  -st-extends:LoginForm;
  -st-variant:true;
}

.loginForVariant::cancel{
  -st-mixin:cancelButton;
}

```

## example usage


### App with buttons:

app.t.css
```css
  :theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:premiumButton;
  }
 
```



### App with extended buttons
app.t.css
```css
  
  :theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:premiumButton;
  }

  .premiumButton::content{
    color:red;
  }
```



### App with color override and extended buttons
app.t.css
```css
  
  :theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:cancelButton premiumButton;
    low:yellow;
    outline:red;
  }
  
  
  .premiumButton::content{
    color:red;
  }
```



### App applying theme on a part
app.t.css
```css
  
  .sidebar:theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:cancelButton premiumButton;
    low:yellow;
    outline:red;
  }
  
  
  .premiumButton::content{
    color:red;
  }
```



### App applying theme on 2 parts
app.t.css
```css
  
  .topbar:theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:cancelButton, premiumButton;
    outline1:red;
  }
  .sidebar:theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:cancelButton, premiumButton;
    outline1:green;
  }
  
  .topbar .premiumButton::content {
    //my custom stuff
  }
  
```





### App with component using a variant
app.t.css
```css
  
 :theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:cancelButton, premiumButton;
    outline1:green;
  }
 
 
  
```

comp.t.css
```css
  
 :import{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-named:cancelButton;
    outline1:green;
  }
 
 .myButton{
  -st-extends:cancelButton;
 }
 
  
```



### App with internal theme using imported theme
local-theme.t.css
```css
  
 :theme{
    -st-from:"stylable-components/zagzag-theme.t.css";
    -st-use:cancelButton, premiumButton;
    outline1:green;
  }
 
 
  
```

app.t.css
```css
  
 :theme{
    -st-from:"local-theme.t.css";
    -st-use:cancelButton, premiumButton;
  }
  
```

comp.t.css
```css
  
 :import{
    -st-from:"local-theme.t.css";
    -st-use:cancelButton;
  }
 
  
```




