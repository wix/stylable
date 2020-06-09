async function init() {
    const [a, b] = await Promise.all([import(/* webpackChunkName: "compA" */'./compA/a'), import(/* webpackChunkName: "compB" */'./compB/b')]);
    document.body.innerHTML = a.CompA({children: ' is here!'}) + b.CompB();
}

init();
