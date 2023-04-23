// stylable-js-module:C:\projects\stylable\packages\esbuild\test\e2e\simple-case\a.st.css
var classes = {"root": "a256335728__root"};

// stylable-js-module:C:\projects\stylable\packages\esbuild\test\e2e\simple-case\b.st.css
var classes2 = {"root": "b2219817027__root"};

// index.js
document.body.className = classes.root + " " + classes2.root;
document.body.textContent = "This color should be green";
