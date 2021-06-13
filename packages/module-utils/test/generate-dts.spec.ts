import { DTSKit } from '@stylable/e2e-test-kit';
import { expect } from 'chai';

const propUnknownNotOnType = "Property 'unknown' does not exist on type";

describe('Generate DTS', function () {
    this.timeout(25000);
    let tk: DTSKit;

    beforeEach(() => {
        tk = new DTSKit();
    });

    afterEach(() => {
        tk.dispose();
    });

    it('should generate classes .d.ts', () => {
        tk.populate({
            'test.st.css': '.root{}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { classes } from "./test.st.css";
                
                eq<"test__root">(classes.root);
            `,
        });

        expect(tk.typecheck('test.ts')).to.equal('');
    });

    it('should warn on non-existing classes', () => {
        tk.populate({
            'test.st.css': '.root{}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { classes } from "./test.st.css";
                
                eq<"test__root">(classes.unknown);
            `,
        });

        expect(tk.typecheck('test.ts')).to.include(propUnknownNotOnType);
    });

    it('should generate CSS var .d.ts', () => {
        tk.populate({
            'test.st.css': '.root { --c1: green; }',
            'test.ts': `
                import { eq } from "./test-kit";
                import { vars } from "./test.st.css";
                
                eq<string>(vars.c1);
            `,
        });

        expect(tk.typecheck('test.ts')).to.equal('');
    });

    it('should warn about non-existing CSS vars', () => {
        tk.populate({
            'test.st.css': '.root { --c1: green; }',
            'test.ts': `
                import { eq } from "./test-kit";
                import { vars } from "./test.st.css";
                
                eq<string>(vars.unknown);
            `,
        });

        expect(tk.typecheck('test.ts')).to.include(propUnknownNotOnType);
    });

    it('should generate Stylable var .d.ts', () => {
        tk.populate({
            'test.st.css': ':vars {c1: green;}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { stVars } from "./test.st.css";
                
                eq<string>(stVars.c1);
            `,
        });

        expect(tk.typecheck('test.ts')).to.equal('');
    });

    it('should warn about non-existing Stylable var', () => {
        tk.populate({
            'test.st.css': ':vars {c1: green;}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { stVars } from "./test.st.css";
                
                eq<string>(stVars.unknown);
            `,
        });

        expect(tk.typecheck('test.ts')).to.include(propUnknownNotOnType);
    });

    it('should generate keyframes .d.ts', () => {
        tk.populate({
            'test.st.css': '@keyframes k1 {0% {} 100% {}}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { keyframes } from "./test.st.css";
                
                eq<string>(keyframes.k1);
            `,
        });

        expect(tk.typecheck('test.ts')).to.equal('');
    });

    it('should warn about non-existing keyframes', () => {
        tk.populate({
            'test.st.css': '@keyframes k1 {0% {} 100% {}}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { keyframes } from "./test.st.css";
                
                eq<string>(keyframes.unknown);
            `,
        });

        expect(tk.typecheck('test.ts')).to.include(propUnknownNotOnType);
    });

    describe('st function', () => {
        it('should support basic usage with root class', () => {
            tk.populate({
                'test.st.css': '.root {}',
                'test.ts': `
                    import { eq } from "./test-kit";
                    import { st, classes } from "./test.st.css";
                    
                    eq<string>(st(classes.root));
                `,
            });

            expect(tk.typecheck('test.ts')).to.equal('');
        });

        it('should support st as an alias of the style function', () => {
            tk.populate({
                'test.st.css': '.root {}',
                'test.ts': `
                    import { st, style } from "./test.st.css";
                    
                    const ST: typeof st = style;
                `,
            });

            expect(tk.typecheck('test.ts')).to.equal('');
        });

        it('should accept any string', () => {
            tk.populate({
                'test.st.css': '.root {}',
                'test.ts': `
                    import { eq } from "./test-kit";
                    import { st } from "./test.st.css";
                    
                    eq<string>(st('str1', 'str2'));
                `,
            });

            expect(tk.typecheck('test.ts')).to.equal('');
        });

        it('should support st second argument as state', () => {
            tk.populate({
                'test.st.css': '.root { -st-states: state1; }',
                'test.ts': `
                    import { eq } from "./test-kit";
                    import { st, classes } from "./test.st.css";
                    
                    eq<string>(st(classes.root, { state1: true }, 'someClass'));
                `,
            });

            expect(tk.typecheck('test.ts')).to.equal('');
        });

        it('should support st second argument as class', () => {
            tk.populate({
                'test.st.css': '.root { -st-states: state1; }',
                'test.ts': `
                    import { eq } from "./test-kit";
                    import { st, classes } from "./test.st.css";
                    
                    eq<string>(st(classes.root, 'someClass', 'someOtherClass'));
                `,
            });

            expect(tk.typecheck('test.ts')).to.equal('');
        });

        it('should warn on non-existing state', () => {
            tk.populate({
                'test.st.css': '.root {}',
                'test.ts': `
                    import { st, classes } from "./test.st.css";
                    
                    st(classes.root, { state1: true });
                `,
            });

            expect(tk.typecheck('test.ts')).to.include(
                "Argument of type '{ state1: boolean; }' is not assignable"
            );
        });

        it('should warn on type mis-match in state', () => {
            tk.populate({
                'test.st.css': '.root { -st-states: state1; }',
                'test.ts': `
                    import { st, classes } from "./test.st.css";
                    
                    st(classes.root, { state1: 'str' });
                `,
            });

            expect(tk.typecheck('test.ts')).to.include(
                "Type 'string' is not assignable to type 'boolean | undefined'"
            );
        });

        it('should warn on type mis-match in multiple states', () => {
            tk.populate({
                'test.st.css': `.root { -st-states: state1; }
                .part { -st-states: state1(string) }`,
                'test.ts': `
                    import { st, classes } from "./test.st.css";
                    
                    st(classes.root, { state1: 'str' });
                    st(classes.part, { state1: true });
                `,
            });

            const diagnostics = tk.typecheck('test.ts');
            expect(diagnostics).to.include(
                "Type 'string' is not assignable to type 'boolean | undefined'"
            );
            expect(diagnostics).to.include(
                "Type 'true' is not assignable to type 'string | undefined'"
            );
        });
    });

    describe('cssStates', () => {
        it('should support basic usage', () => {
            tk.populate({
                'test.st.css': '.root { -st-states: state1; }',
                'test.ts': `
                    import { eq } from "./test-kit";
                    import { cssStates } from "./test.st.css";
                    
                    eq<string>(cssStates({ state1: true }));
                `,
            });

            expect(tk.typecheck('test.ts')).to.equal('');
        });

        it('should warn on non-existing states', () => {
            tk.populate({
                'test.st.css': '.root { -st-states: state1; }',
                'test.ts': `
                    import { cssStates } from "./test.st.css";
                    
                    cssStates({ unknown: true });
                `,
            });

            expect(tk.typecheck('test.ts')).to.include(
                "only specify known properties, and 'unknown' does not exist in type"
            );
        });

        it('should warn on type mis-match in states', () => {
            tk.populate({
                'test.st.css': '.root { -st-states: state1; }',
                'test.ts': `
                    import { cssStates } from "./test.st.css";
                    
                    cssStates({ state1: 'str' });
                `,
            });

            expect(tk.typecheck('test.ts')).to.include("Type 'string' is not assignable to type");
        });
    });
});
