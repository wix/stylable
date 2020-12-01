const Lib = {
    async loadButton() {
        return import(/* webpackChunkName: "Button" */ './button');
    },
    async loadGallery() {
        return import(/* webpackChunkName: "Gallery" */ './gallery');
    },
};

Lib.loadGallery();
Lib.loadButton();

export default Lib;
