import { classes, cssStates, namespace, stVars } from "./index.st.css";
window.stylableClasses = classes;
window.$namespace = namespace;
window.stVars = stVars;

document.documentElement.classList.add(classes.root);
document.body.classList.add(classes.used);

const state = cssStates({ x: true });
document.documentElement.classList.add(state);

