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

:theme{
  -st-implements:"./base-theme.t.css";
  -st-use:cancelButton as cancel;
}
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
}


```

### Base-Theme.t.css
the base theme file is relevant when creating components that work with many themes
```css

:import{
  -st-default:Button;
  -st-from:"./button.t.css";
}

.cancelButton{
  -st-variant:true;
  -st-extends:Button;
}
.premuimButton{
  -st-variant:true;
  -st-extends:Button;
}


```

### Backoffice-Theme.t.css
the theme file may include css for many components, only those acctualy required are added to the css
```css
:import{
  -st-default:BaseTheme;
  -st-from:"./base-theme.t.css";
}
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
.root{
  -st-extends:BaseTheme;
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
  background:value(low);
}
.premuimButton{
  background:value(high);
}
LoginForm{
  //login form  default style here
}

.loginForVariant{
  -st-extends:LoginForm;
  -st-variant:true;
}

.loginForVariant::cancel{
  color:red;
}

```

## example usage


### App with buttons and LoginForm:

app.t.css
```css
  :theme{
    -st-from:"stylable-components/backoffice-theme.t.css";
    -st-use:premiumButton loginFormVariant;
  }
 
```

### App with extended buttons
app.t.css
```css
  
  :theme{
    -st-from:"stylable-components/backoffice-theme.t.css";
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
    -st-from:"stylable-components/backoffice-theme.t.css";
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
    -st-from:"stylable-components/backoffice-theme.t.css";
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
    -st-from:"stylable-components/backoffice-theme.t.css";
    -st-use:cancelButton, premiumButton;
    outline1:red;
  }
  .sidebar:theme{
    -st-from:"stylable-components/backoffice-theme.t.css";
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
    -st-from:"stylable-components/backoffice-theme.t.css";
    -st-use: premiumButton,cancelButton;
    outline1:green;
  }
 
 
  
```

comp.t.css
```css
  
 :theme{
    -st-implements:"stylable-components/backoffice-theme.t.css";
    -st-use: premiumButton,cancelButton;
  }
 
 .cancelButton{
 }
 
  
```



### App with internal theme using imported theme
local-theme.t.css
```css
  
  :theme{
    -st-from:"stylable-components/backoffice-theme.t.css";
    -st-default:Theme;
    -st-use:cancelButton, premiumButton;
    outline1:green;
  }
 
  cancelButton::content{
    color:red;
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
  
 :theme{
    -st-implements:"gaga-theme.t.css";
    -st-use:cancelButton;
  }
 
  .as .cancelButton{
    color:red;
  }
```




