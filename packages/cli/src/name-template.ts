export function nameTemplate(template: string, data: Record<string, string>) {
    return template.replace(/\[(.*?)\]/gm, (origin, key) =>
        data[key] !== undefined ? data[key] : origin
    );
}
