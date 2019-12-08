import { classes } from './index.st.css';
import { classes as lib1Classes } from 'lib1';
import { classes as lib2Classes } from 'lib2';

document.documentElement.classList.add(classes.root);
document.documentElement.classList.add(lib1Classes.root);
document.documentElement.classList.add(lib2Classes.root);
