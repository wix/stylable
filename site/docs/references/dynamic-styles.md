# Dynamic styles

Here at **Stylable** we look at writing CSS through runtime JS as an anti pattern. it causes huge browser redraws and generaly needs a lot of runtime code to run.

in most cases where you need to change style attributes dynamically it is better to use inline-styles.

if you MUST use dynamic CSS in your application you can import and use "stylable-dynamics"


## Example usage

a component that changes an internal parts background-color according to a component prop

```ts
import {writeCss,deleteCss} from "stylable/runtime";
import {stylable} from "wix-react-tools";
import styles from "./my-comp.st.css";
import * as React from "react";

@stylable(styles)
export default class MyComp extends React.Component<{itemColor:string},{}>{
    private dynamicCssToken:number;
    render(){
        this.dynamicCssToken = writeCss(styles,"gallery::item",{
            backgroundColor:this.props.itemColor
        }, this.dynamicCssToken);
        return <div></div>
    }
}


```