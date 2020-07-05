import { $ } from '@stylable/runtime/cjs/css-runtime-renderer';
import { create } from '@stylable/runtime/cjs/css-runtime-stylesheet';

const Lib = {
    renderer: $,
    create,
    async loadButton() {
        return import(/* webpackChunkName: Button */ './button');
    },
    async loadGallery() {
        return import(/* webpackChunkName: Gallery */ './gallery');
    },
};

Lib.loadButton();
Lib.loadGallery();

export default Lib;
