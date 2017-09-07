var __playgroundInfo = window.__playgroundInfo || null;
(function () {
    if (!__playgroundInfo) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = gotPlayground;
        httpRequest.open('GET', '/playground.json');
        httpRequest.send();
    }
    
    function loadPagePlayground(e) {
        var pagePath = gitbook.page.getState().filepath;
        if (!!__playgroundInfo[pagePath]) {
            __playgroundInfo[pagePath].forEach(function (val) {
                try {
                    window['change' + val]();
                } catch(e){
                    console.error('no change function waiting.');
                }
            });
        }
    }
    
    function gotPlayground() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
            if (httpRequest.status === 200) {
                __playgroundInfo = JSON.parse(httpRequest.responseText);
                gitbook.events.bind('start', loadPagePlayground);
                gitbook.events.bind('page.change', loadPagePlayground);
            } else {
                console.error('no json - failure!!!!');
            }
        }
    }
})();
