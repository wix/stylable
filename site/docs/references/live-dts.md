# Live DTS generation

Here at **Stylable** we love TypeScript, we use it extensivly and want as Strong-Typed dev experience as we can get.

In order to get better completions and validations for our TypeScript components we've added a DTS generator to Stylable. if you elect not to use it all your styleSheets will default to a less strong-typed interface

If you activate the DTS-generator you wll see a *.st.css.d.ts file generated for each *.st.css file in your project in its directory.

this allows us to give you completions for the classes used in the StyleSheet.

# Example


Css :
```css
/* my-comp.st.css */
.myInnerPart{
    -st-states:index(number);
    color:red;
}
```

Generated DTS :
```ts
        
    type StateMap = {
        c:{
            selected:number;
        },
        root:{noStatesAvailable:never}
    }

    type ClassNames =  "myInnerPart" | "root"
    interface StyleSheet{
        <ClassName extends ClassNames>( className:ClassName|ClassName[], 
        states?:StateMap[ClassName]):string;
        myInnerPart:string;
        root:string;
    }
    declare const content:StyleSheet
    export default content
  
```

this generated DTS provides completion for the different classes and states, we recomend running in watch mode while you work 