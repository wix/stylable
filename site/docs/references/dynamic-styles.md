# Dynamic styles

Here at **Stylable** we look at writing CSS through runtime JS as a last result. it causes huge browser redraws and generaly needs a lot of runtime code to run.

in most cases where you need to change style attributes dynamically it is better to use inline-styles.

if you MUST use dynamic CSS in your application you can import and use "renderCss" and "removeCss" from stylable runtime.


## Render CSS

render CSS uses a token to ensure dynamic CSS doesnt leak between instances, old CSS is removed when dynamically changed and CSS is not re-rendered unless changed.

this token is returned by renderCSS and should be passed to it in subsequent calls by the same component instance.


Params:

| name | type | description |
|----|----|----|
| styleSheet | StylableStylesheet | the overriding components stylesheet |
| styles | StylableDynamicCSS | the CSS override to render |
| token | string \| undefined | rerender-token 

Returns: token

## Remove CSS

clears CSS created by render CSS.

if you have a lot of components using dynamic CSS, you should clear it when they are unmounted.

## Example usage

a component that changes an internal parts background-color according to a component prop

```tsx
import {renderCss,deleteCss} from "stylable/runtime";
import {stylable} from "wix-react-tools";
import styles from "./my-comp.st.css";
import Gallery from "./my-gallery";
import * as React from "react";

@stylable(styles)
export default class MyComp extends React.Component<{itemColor:string},{}>{
    private dynamicCssToken:string;
    render(){
        this.dynamicCssToken = renderCss(styles,{
            ".gallery::item":{
                backgroundColor:this.props.itemColor
            }
        }, this.dynamicCssToken);

        return <div st-dynamic-style={this.dynamicCssToken}>
            <Gallery/>
        </div>
    }
    componentWillUnmount(){
        deleteCss(this.dynamicCssToken);
    }
}


```