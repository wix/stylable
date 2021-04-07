import { classes } from './dynamic.st.css';

import('./inner-dynamic');

document.body.innerHTML += `<h1 class=${classes.root}>Hello From A Dynamic</h1>`;
