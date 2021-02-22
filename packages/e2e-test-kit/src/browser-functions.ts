import type { Response } from 'playwright-core';

export function filterAssetResponses(responses: Response[], assetNames: string[]) {
    return assetNames
        .map((fileName) => responses.find((res) => res.url().endsWith(fileName)))
        .filter(Boolean) as Response[];
}

function getStyleElementsMetadata({
    includeRuntimeId,
    includeCSSContent,
}: any | { includeCSSContent?: boolean; includeRuntimeId?: boolean } = {}) {
    const styleElements = Array.from(document.head.getElementsByTagName('style'));
    return styleElements.map((styleEl) => {
        const data: { id?: string; depth?: string; css?: string; runtime?: string } = {
            id: styleEl.getAttribute('st-id')!,
            depth: styleEl.getAttribute('st-depth')!,
        };
        if (includeRuntimeId) {
            data.runtime = styleEl.getAttribute('st-runtime')!;
        }
        if (includeCSSContent) {
            data.css = styleEl.textContent!.replace(/\r?\n/g, '\n');
        }
        return data;
    });
}

function getCSSLinks() {
    const styleElements = Array.from(document.head.getElementsByTagName('link'));
    return styleElements.map((cssLink) => cssLink.getAttribute('href'));
}

export const browserFunctions = {
    getStyleElementsMetadata,
    getCSSLinks,
};
