

## Install, Configure and Build

Install it for a project

npm install stylable

best practices for WebPack or other popular build tool with React
(Then other options - clean project w/ no build and/or no React)

Stylesheet file
Component file

Import stylesheet into component file

What part of library has been loaded into runtime. Don't want to bring parser and other stuff into client-side. Different between working at build time or runtime. We recommend build time but then need WebPack or other build tool. Must be decided while users working cuz depends on what has to be imported. (Maybe some debugging options can give.)

Don't have to provide source maps for CSS. Cuz everything is compiled down to CSS. Debug mode could give you comments on where the rules came from. 


Add to feature list: Debug comments added to CSS - where did styling come from to produce CSS. Configure how you want CSS outputted. Removed for production - 



Good to have "create app" instruction

npm stylable - what will user get?
 - boilerplate

 
Specificity document - transpiler switch to show specificity  or comment to show specificity

List of 50 components 
CSS mixin of how something looks - UI kit to provide mixins and enable writing your own
some containers need component 

Provide instructions for writing own mixins or CSS or JS

TUTORIAL

2 component files 

Document css.ts file - used for only internal use. not documenting JavaScript API 

generateSVGURL - mixin 


vbox, hbox, grid - will be mixins
But more complex layouts have to be components 
Component is needed only if logic needed to build it.


StylableReact - POC

Create component file as .tsx - social-button.tsx
Create a css file - social-button.css (social-button.css.ts)


For each component have a different CSS file. Associate component with CSS file in the component ts file.


Styling social button from the outside:
Add a className in tsx file.

In CSS for 





