///
/// 2016-10-13 GZ init file creation
/// PhantomJS helper
///

function createHelper(initData) {
    var page = require('webpage').create();
    page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36';
    if (initData.userAgent) page.settings.userAgent = initData.userAgent;

    var initAttaches = ['onConsoleMessage','onError','onCallback','onResourceRequested','onResourceReceived','onLoadStarted'];
    _.map(initAttaches, function(name){
        var func = initData[name];
        if (func)  {
            page[name] = func;
            console.log('attach ' + name);
        }
    });

    page.open(initData.url, initData.onSuccess? initData.onInitialUrlSuccess: function (status) {
        if (status === "success") {
        }
    });


    page.onLoadFinished = function () {
        if (initData.onLoadFinished) initData.onLoadFinished(page);
    };

    return page;
}

function createDownloadHelper(initData) {
    if (!initData.callContext) initData.callContext = {};
    if (initData.getDownloadFileContext) {
        var origResReq = initData.onResourceRequested;
        initData.onResourceRequested = function (request) {
            initData.callContext._phFileDownloadRequest = initData.getDownloadFileContext(request, initData.callContext);
            if (origResReq)origResReq(request);
        }
    }
    var oldOnLoadFinished = initData.onLoadFinished;
    initData.onLoadFinished = function(page) {
        initData.callContext = page.evaluate(function(callContext) {
            if(callContext._phFileDownloadRequest) {
                var downloadInfo = callContext._phFileDownloadRequest;
                callContext._phFileDownloadRequest = null;
                console.log('downloading ' + downloadInfo.url);
                var xhr = new XMLHttpRequest();
                xhr.open(downloadInfo.method||'POST', downloadInfo.url, true);
                xhr.responseType = 'arraybuffer';
                xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                xhr.onload = function () {
                    var data = '';
                    var u8 = new Uint8Array(this.response);
                    for (var i = 0; i < u8.length;i++) {
                        data += ('0' + u8[i].toString(16)).substr(-2);
                    }
                    window.callPhantom({saveFileData:{data: data}});
                };
                if (downloadInfo.postData) xhr.send(downloadInfo.postData);
                console.log('return after file load');
            }
            return callContext;
        }, initData.callContext);
        if (oldOnLoadFinished)oldOnLoadFinished(page, initData.callContext);
    }
    return createHelper(initData);
}

module.exports = {
    createHelper : createHelper,
    createDownloadHelper : createDownloadHelper
};