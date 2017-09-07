window.createPlaygroundFrame = function createPlaygroundFrame(iframeID, info) {
    var iframe = document.getElementById(iframeID);
    if (!iframe) {
        console.log('error Iframe not found', iframeID);
        return;
    }

    var template = [
        '<script src="https://unpkg.com/react@15.3.1/dist/react.min.js"></script>',
        '<script src="https://unpkg.com/react-dom@15.3.1/dist/react-dom.min.js"></script>',
        '<script>window.react = React;</script>',
        '<script src="/Playground.bundle.js"></script>',
        '<script src="/vs/loader.js"></script>',
        '<link rel="stylesheet" href="/gitbook/gitbook-plugin-playground/playground.css">',

        '<div id="playground_root"></div>',
        '<script>',
        'function createPlayGround() {',
            'var loaderUrl = "/vs/loader.js";',
            "function entryWrapper (entryName) {\n\
                        return \"import * as React from 'react';\\\n\
                        import * as ReactDOM from 'react-dom';\\\n\
                        import EntryComp from './\" + entryName + \"';\\\n\
                        ReactDOM.render(<EntryComp />, document.getElementById('root'))\"}",
            'var projects = ' + JSON.stringify(info.projects),
            'projects.playgroundProject.entryWrapper = entryWrapper',

            'window["require"]["config"]({baseUrl: "/"})',
            'ReactDOM.render(React.createElement(Playground.default, {',
                    'playgroundName: "playground",',
                    'headerText: "' + info.headerText + '",',
                    'useLoader: true,',
                    'loaderUrl: loaderUrl,',
                    'projects: projects' ,
                '}), document.getElementById("playground_root"))',
            '}',
        'if (document.readyState === "complete") {',
            'createPlayGround()',
        '} else {',
            'document.addEventListener("DOMContentLoaded",createPlayGround)',
        '}',
        '</script>'
    ].join('\n');

    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write(template);
    doc.close();
};
