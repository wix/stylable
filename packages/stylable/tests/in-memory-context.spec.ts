import { Generator } from '../src/generator';
import { expect } from "chai";


describe('generator', function () {
    
    it('generate scoped selector', function () {

        const ctx = new Generator({namespaceDivider: "__THE_GREAT_DIVIDER__"});

        ctx.add('.container', {}, 'TheNameSpace')

        expect(ctx.buffer[0]).to.eql('.TheNameSpace__THE_GREAT_DIVIDER__container {}');

    });


    it('generate scoped selector with multiple classes', function () {

        const ctx = new Generator({namespaceDivider: "__THE_GREAT_DIVIDER__"});

        ctx.add('.container .img', {}, 'TheNameSpace')

        expect(ctx.buffer[0]).to.eql('.TheNameSpace__THE_GREAT_DIVIDER__container .TheNameSpace__THE_GREAT_DIVIDER__img {}');

    });

});


