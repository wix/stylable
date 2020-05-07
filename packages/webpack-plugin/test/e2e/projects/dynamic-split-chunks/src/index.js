Promise.all([import('./compA/compA'), import('./compB/compB')]).then(([{ compA }, { compB }]) => {
    document.body.innerHTML = compA() + compB();
});
