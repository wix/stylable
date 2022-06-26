// "used" points to the "unused" module, both have the same identical namespace, due to webpack configuration
import { classes as used } from './used.st.css';

document.documentElement.classList.add(used.root);
