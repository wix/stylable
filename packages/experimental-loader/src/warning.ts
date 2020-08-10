// Adopted from css-loader;
export class Warning extends Error {
    constructor(warning: { text: string; line: number; column: number }) {
        super(String(warning));
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

        const { text, line, column } = warning;
        this.name = 'Warning'; // Based on https://github.com/postcss/postcss/blob/master/lib/warning.es6#L74
        // We don't need `plugin` properties.

        this.message = `${this.name}\n\n`;

        if (typeof line !== 'undefined') {
            this.message += `(${line}:${column}) `;
        }

        this.message += text; // We don't need stack https://github.com/postcss/postcss/blob/master/docs/guidelines/runner.md#31-dont-show-js-stack-for-csssyntaxerror

        this.stack = undefined;
    }
}

interface PostCSSError {
    reason: string;
    line: string;
    column: string;
    showSourceCode(): string;
}

export class CssSyntaxError extends Error {
    constructor(error: PostCSSError) {
        super(error.toString());
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

        const { reason, line, column } = error;

        this.name = 'CssSyntaxError';

        // Based on https://github.com/postcss/postcss/blob/master/lib/css-syntax-error.es6#L132
        // We don't need `plugin` and `file` properties.
        this.message = `${this.name}\n\n`;

        if (typeof line !== 'undefined') {
            this.message += `(${line}:${column}) `;
        }

        this.message += `${reason}`;

        const code = error.showSourceCode();

        if (code) {
            this.message += `\n\n${code}\n`;
        }

        // We don't need stack https://github.com/postcss/postcss/blob/master/docs/guidelines/runner.md#31-dont-show-js-stack-for-csssyntaxerror
        this.stack = undefined;
    }
}
