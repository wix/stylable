import { classes } from './index.st.css';
(async () => {
    const { classes: libClasses } = await import('lib');
    document.documentElement.classList.add(classes.root);
    document.documentElement.classList.add(libClasses.root);
})();

// document.documentElement.classList.add(getName());
