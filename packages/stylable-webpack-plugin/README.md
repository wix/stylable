# Stylable Webpack Plugin

- EXPERIMENTAL Webpack 4 plugin!

## Plugin Options

|  option |type   |default   |description   |
|---------|:-----:|:--------:|--------------|
| outputCSS | boolean | false | Generate css files |
| filename | string | [name].bundle.css | The name of the css bundle file when outputCSS is true |
| includeCSSInJS | boolean | true | include target css in the JavaScript modules (used by runtime renderer) |
| createRuntimeChunk | boolean | false | Move **all** stylable modules into separate chunk with runtime renderer |
  
## Possible Configs

CSS From JS Only (Default Options)
```js
new StylableWebpackPlugin({ 
    outputCSS: false, 
    includeCSSInJS: true
})
```

CSS From Chunk Assets Only
```js
new StylableWebpackPlugin({ 
    outputCSS: true, 
    filename: "[name].bundle.css",
    includeCSSInJS: false
})
```


CSS From Bundle CSS Only
```js
new StylableWebpackPlugin({ 
    outputCSS: true, 
    filename: "[name].bundle.css",
    includeCSSInJS: false ,
    createRuntimeChunk: true
})
```

CSS Assets Are handled by `url-loader` + `file-loader`

```js
 module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 8192
            }
          }
        ]
      }
    ]
  }
```

**IF YOU USING CSS_LOADER/EXTRACT MAKE SURE TO EXCLUDE `.st.css` FILE FROM THE PROCESS**