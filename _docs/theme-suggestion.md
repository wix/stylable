This file lays out an example of how to theme an application using stylable

## Example Assets

### External component library: `a-comps` 

#### button.st.css
```css
.root {
  display: inline-block; /* button root inner style */
}
.content {} /* button pseudo-element */
```
#### login-form.st.css
```css
:theme{
  -st-implements: "./base-theme.st.css"; /* indicate that base-theme should be available (rendered to CSS) */
  -st-use: cancelButton as cancel; /* require cancelButton class to be available and use as cancel */
}
:import {
  -st-default: Button;
  -st-from: "./button.st.css";
}
.ok {
  -st-extends: Button; /* ok pseudo-element extending a button */
}
.cancel {} /* not needed - defined by the use of cancelButton */
```
#### base-theme.st.css
Base theme file is relevant when creating components that work with many themes
```css
:import{
  -st-from: "./button.st.css";
  -st-default: Button;
}
.cancelButton {
  -st-variant: true;
  -st-extends: Button;
  background: red;
}
.premiumButton {
  -st-variant: true;
  -st-extends: Button;
  background: purple;
}
```
### backoffice-theme.st.css
```css
:import {
  -st-default: BaseTheme;
  -st-from: "./base-theme.st.css";
}
:import {
  -st-default: Button;
  -st-from: "./button.st.css";
}
:import {
  -st-default: LoginForm;
  -st-from: "./login-form.st.css";
}
.root{
  -st-extends:BaseTheme; /*  */
}
:vars{
  color1: gold;
  color2: silver;
  color3: salmon;
}
Button{
  outline:value(color1);
}
.cancelButton{
  background:value(color2);
}
.premuimButton{
  background:value(color3);
}
LoginForm {
  /* login form  default style here */
}
.loginFormDark {
  -st-variant: true;
  -st-extends: LoginForm;
}
.loginFormDark::cancel {
  color: darkred;
}
```

> **Note**: Theme file may include CSS for many components, only those actually required are added to the output CSS.

## example usage

### App with buttons and LoginForm:

app.st.css
```css
:theme{
  -st-from: "a-comps/backoffice-theme.st.css";
  -st-use: premiumButton, loginFormDark;
}
```
output.css
```css
/* a-comps/button.st.css */
.Button__root {
  display: inline-block;
}

/* a-comps/base-theme.st.css > theme on ./app.st.css root */
.App__root .BaseTheme__cancelButton.Button__root {
  color: red;
}
.App__root .BaseTheme__premiumButton.Button__root {
  color: purple;
}

/* a-comps/backoffice-theme.st.css > theme on ./app.st.css root */
.App__root Button__root {
  outline: gold; /* color1 */
}
.App__root .BaseTheme__cancelButton.Button__root {
  background: silver; /* color2 */
}
.App__root .BaseTheme__premuimButton.Button__root {
  background: salmon; /* color3 */
}
.App__root .BackOfficeTheme__loginFormDark.LoginForm__root .BaseTheme__cancelButton {
  color: darkred;
}
```

### App with extended buttons

app.st.css
```css
:theme{
  -st-from: "a-comps/backoffice-theme.st.css";
  -st-use: premiumButton;
}
.premiumButton::content{
  color:yellow;
}
```
output.css
```css
/* a-comps/button.st.css */
.Button__root { 
  display: inline-block;
}

/* a-comps/base-theme.st.css > theme on ./app.st.css root */
.App__root .BaseTheme__premiumButton.Button__root { 
  color: purple;
}

/* a-comps/backoffice-theme.st.css > theme on ./app.st.css root */
.App__root Button__root {
  outline: gold; /* color1 */
}
.App__root .BackOfficeTheme__premuimButton.Button__root {
  background: salmon; /* color3 */
}

/* ./app.st.css */
.App__root .BackOfficeTheme__premiumButton.Button__root .Button__content {
  color: yellow;
}
```

### App with vars override and extended buttons

app.st.css
```css
:theme{
  -st-from: "a-comps/backoffice-theme.st.css";
  -st-use: cancelButton, premiumButton;
  color1: aqua;
  color2: chocolate;
}  
.premiumButton::content{
  color: pink;
}
```
output.css
```css
/* a-comps/button.st.css */
.Button__root { /* button is used in app */
  display: inline-block;
}

/* a-comps/base-theme.st.css > theme on ./app.st.css root */
.App__root .BaseTheme__cancelButton.Button__root {
  color: red;
}
.App__root .BaseTheme__premiumButton.Button__root {
  color: purple;
}

/* a-comps/backoffice-theme.st.css > theme on ./app.st.css root */
.App__root Button__root {
  outline: aqua; /* color1 override */
}
.App__root .BackOfficeTheme__cancelButton.Button__root {
  background: chocolate; /* color2 override */
}
.App__root .BackOfficeTheme__premuimButton.Button__root {
  background: salmon; /* color3 */
}

/* ./app.st.css */
.App__root .BackOfficeTheme__premiumButton.Button__root .Button__content {
  color: pink;
}
```

### App with component using a variant (using button)

app.st.css
```css
 :theme {
    -st-from: "a-comps/backoffice-theme.st.css";
    -st-use: cancelButton;
    color1: khaki;
  }
  .premiumButton{
    color: hotpink;
  }
```
comp.st.css
```css
:theme {
  -st-implements: "a-comps/backoffice-theme.st.css";
  -st-use: cancelButton;
}
.cancelButton { 
  color: maroon;
}  
```
output.css
```css
/* a-comps/button.st.css */
.Button__root {
  display: inline-block;
}

/* a-comps/base-theme.st.css > theme on ./app.st.css root */
.App__root .BaseTheme__cancelButton.Button__root { /* used by app */
  color: red;
}

/* a-comps/backoffice-theme.st.css > theme on ./app.st.css root  */
.App__root Button__root {
  outline: khaki; /* color1 override */
}
.App__root .BackOfficeTheme__cancelButton.Button__root {
  background: silver; /* color2 */
}

/* ^ theme and theme dependencies (Button__root) are hoisted to top */

/* ./comp.st.css */
.Comp__root .BaseTheme__cancelButton.Button__root { /* cancelButton used in comp */
  color: maroon; 
}

/* ./app.st.css */
.App__root .BackOfficeTheme__premiumButton.Button__root {
  color: hotpink;
}
```

### App applying theme on a part

app.st.css
```css
.sidebar:theme {
  -st-from: "a-comps/backoffice-theme.t.css";
  -st-use: cancelButtonm, premiumButton;
  color1: orange;
  color2: tomato;
}
.premiumButton::content{
  color:olive;
}
```
output.css
```css
/* a-comps/button.st.css */
.Button__root {
  display: inline-block;
}

/* a-comps/base-theme.st.css > theme on ./app.st.css sidebar */
.App__sidebar .BaseTheme__cancelButton.Button__root {
  color: red;
}
.App__sidebar .BaseTheme__premiumButton.Button__root {
  color: purple;
}

/* a-comps/backoffice-theme.st.css > theme on ./app.st.css sidebar  */
.App__sidebar Button__root {
  outline: orange; /* color1 override */
}
.App__sidebar .BackOfficeTheme__cancelButton.Button__root { 
  background: tomato; /* color2 override */
}
.App__sidebar .BackOfficeTheme__premuimButton.Button__root {
  background: salmon; /* color3 */
}

/* ./app.st.css */
.App__root .BackOfficeTheme__premiumButton.Button__root .Button__content {
  color: olive;
}
```

### App with project theme using imported theme (using Button)

main-theme.st.css
```css
:import {
  -st-from: "a-comps/backoffice-theme.t.css";
  -st-default: Theme;
  color1: darkviolet;
}
.root {
  -st-extends: Theme;
}
.cancelButton::content{
  color: darkcyan;
}
```
app.st.css
```css
:theme {
  -st-from: "./main-theme.st.css";
  -st-use: cancelButton;
}
```
comp.st.css
```css
:theme {
  -st-implements: "./main-theme.st.css";
  -st-use: cancelButton;
}
.controls .cancelButton {
  color: darksalmon;
}
```
output.css
```css
/* a-comps/button.st.css */
.Button__root {
  display: inline-block;
}

/* a-comps/base-theme.st.css > theme on ./app.st.css root */
.App__root .BaseTheme__cancelButton.Button__root {
  color: red;
}

/* a-comps/backoffice-theme.st.css > theme on ./app.st.css root  */
.App__root Button__root {
  outline: darkviolet; /* color1 override */
}
.App__root .BackOfficeTheme__cancelButton.Button__root .Button__content {
  background: darkcyan; /* color2 override */
}

/* ^ theme and theme dependencies (Button__root) are hoisted to top */

.Comp__root .Comp__controls .BaseTheme__cancelButton.Button__root {
  color: darksalmon; 
}
```
