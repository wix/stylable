import { classes } from './index.st.css';

document.body.classList.add(...classes.root.split(' '));
// check that class names are not optimized in production mode
const classTest = document.createElement('div');
classTest.classList.add('native-class');
document.body.appendChild(classTest);
