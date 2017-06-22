import { InMemoryContext } from '../src/in-memory-context';
import { expect } from "chai";


describe('in-memory-context', function () {
    
    it('generate scoped selector', function () {

        const ctx = new InMemoryContext("__THE_GREAT_DIVIDER__");

        ctx.add('.container', {}, 'TheNameSpace')

        expect(ctx.buffer[0]).to.eql('.TheNameSpace__THE_GREAT_DIVIDER__container {}');

    });


    it('generate scoped selector with multiple classes', function () {

        const ctx = new InMemoryContext("__THE_GREAT_DIVIDER__");

        ctx.add('.container .img', {}, 'TheNameSpace')

        expect(ctx.buffer[0]).to.eql('.TheNameSpace__THE_GREAT_DIVIDER__container .TheNameSpace__THE_GREAT_DIVIDER__img {}');

    });

});


