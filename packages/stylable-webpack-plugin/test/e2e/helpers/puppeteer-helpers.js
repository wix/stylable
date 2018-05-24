function filterAssetResponses(responses, assetNames) {
  return assetNames
    .map(fileName => {
      return responses.find(res => {
        return res.url().endsWith(fileName);
      });
    })
    .filter(Boolean);
}

function getStyleElementsMetadata(getCss) {
  const styleElements = Array.from(document.head.getElementsByTagName("style"));
  return styleElements.map(styleEl => {
    const data = {
      id: styleEl.getAttribute("st-id"),
      depth: styleEl.getAttribute("st-depth")
    };
    if (styleEl.getAttribute("st-theme")) {
      data.theme = true;
    }
    if (getCss) {
      data.css = styleEl.textContent.replace(/\r?\n/g, '\n');
    }
    return data;
  });
}

exports.filterAssetResponses = filterAssetResponses;

exports.browserFunctions = {
  getStyleElementsMetadata
};
