/**
 * Naive deindent - takes in a string and:
 *  1. find the minimal indentation across all lines with content
 *  2. removes the minimal whitespace for each line
 *  3. attempt to remove first and last line in case of empty lines to improve usage
 *
 * NOTICE: treat tab (\t) as a single character - all lines are expected to be indented in the same format
 */
export function deindent(text: string) {
    if (!text) {
        return text;
    }
    const lines = text.split('\n');
    let min = text.length;
    for (const line of lines) {
        if (!line || !line.trim()) {
            continue;
        }
        const indent = line.match(/^[\s\t]+/);
        const indentSize = indent?.[0].length || 0;
        if (indentSize < min) {
            min = indentSize;
        }
    }
    return lines
        .map((line) => line.slice(min))
        .join('\n')
        .trim();
}
