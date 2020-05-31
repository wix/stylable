import type { Response } from 'puppeteer';

export function filterAssetResponses(responses: Response[], assetNames: string[]) {
    return assetNames
        .map((fileName) => responses.find((res) => res.url().endsWith(fileName)))
        .filter(Boolean) as Response[];
}

function getStyleElementsMetadata(getCss: boolean) {
    const styleElements = Array.from(document.head.getElementsByTagName('style'));
    return styleElements.map((styleEl) => {
        const data: { id?: string; depth?: string; css?: string } = {
            id: styleEl.getAttribute('st-id')!,
            depth: styleEl.getAttribute('st-depth')!,
        };
        if (getCss) {
            data.css = styleEl.textContent!.replace(/\r?\n/g, '\n');
        }
        return data;
    });
}

export const browserFunctions = {
    getStyleElementsMetadata,
};
