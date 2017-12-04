"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var value_template_1 = require("../src/value-template");
describe('value-template', function () {
    it('should replace "value()" function with actual value', function () {
        var result = value_template_1.valueReplacer('value(A)', { A: 'the value' }, function (value) { return value; });
        chai_1.expect(result).to.equal('the value');
    });
    it('should replace "value()" function with actual value with transform value', function () {
        var result = value_template_1.valueReplacer('value(A)', { A: 'the value' }, function (value) { return value + '!!!'; });
        chai_1.expect(result).to.equal('the value!!!');
    });
    it('should replace multiple "value()" functions with actual values', function () {
        var result = value_template_1.valueReplacer('value(A) value(B)', { A: 'the value', B: 'other value' }, function (value) { return value; });
        chai_1.expect(result).to.equal('the value other value');
    });
    it('should replace reference "value()" functions with actual values', function () {
        var result = value_template_1.valueReplacer('value(A)', { A: 'value(B)', B: 'source value' }, function (value) { return value; });
        chai_1.expect(result).to.equal('source value');
    });
    it('should handle cyclic "value()"', function () {
        var result = value_template_1.valueReplacer('value(A)', { A: 'value(B)', B: 'value(A)' }, function (value) { return value; });
        chai_1.expect(result).to.equal('cyclic value');
    });
    describe('debug', function () {
        it('should not add origin when value is the same', function () {
            var result = value_template_1.valueReplacer('blue', { A: 'x', B: 'y' }, function (value) { return value; }, true);
            chai_1.expect(result).to.equal('blue');
        });
        it('should add origin comment', function () {
            var result = value_template_1.valueReplacer('value(A) value(B)', { A: 'x', B: 'y' }, function (value) { return value; }, true);
            chai_1.expect(result).to.equal('x y /* value(A) value(B) */');
        });
        it('should add cyclic path comment', function () {
            var result = value_template_1.valueReplacer('value(A)', { A: 'value(B)', B: 'value(A)' }, function (value) { return value; }, true);
            chai_1.expect(result).to.equal('cyclic value(A>B>A) /* value(A) */');
        });
    });
});
//# sourceMappingURL=value-template.spec.js.map