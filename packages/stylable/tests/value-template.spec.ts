import { expect } from "chai";
import { valueReplacer } from "../src/value-template";

describe('value-template', function () {

    it('should replace "value()" function with actual value', function(){
        expect(valueReplacer('value(A)', {A: 'the value'}, (value)=>value)).to.equal('the value');
    });

    it('should replace multiple "value()" functions with actual values', function(){
        expect(valueReplacer('value(A) value(B)', {A: 'the value', B: 'other value'}, (value)=>value)).to.equal('the value other value');
    });
});

