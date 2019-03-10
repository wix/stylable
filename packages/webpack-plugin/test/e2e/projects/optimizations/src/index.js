import { classes, cssStates, namespace, stVars } from "./index.st.css";
window.stylableClasses = classes;
window.namespace = namespace;
window.stVars = stVars;

document.documentElement.classList.add(classes.root);
document.body.classList.add(classes.used);

const state = cssStates({ x: true });
document.documentElement.classList.add(state);

const global1 = document.createElement('div');
global1.className = 'global1';

const global2 = document.createElement('div');
global2.className = 'global2';
global2.textContent = 'Globals Here!!!';
global1.appendChild(global2);

document.body.appendChild(global1);
