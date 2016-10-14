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
        if (func) page[name] = func;
    });

    page.open(initData.url, initData.onSuccess? initData.onInitialUrlSuccess: function (status) {
        if (status === "success") {
        }
    });


    page.onLoadFinished = function () {
        if (!initData._loadFinished) initData._loadFinished = 0;
        initData._loadFinished++;
        if (initData.onLoadFinished) initData.onLoadFinished(page);
    };
    page.onLoadStarted = function () {
        if (!initData._loadStarted)initData._loadStarted = 0;
        initData._loadStarted++;
        if (initData.onLoadFinished) initData.onLoadFinished(page);
    };

    return page;
}

///
/// For save file to happen, need to: add getDownloadFileContext, which return request if need to download, and set
/// _saveFileName
function createDownloadHelper(initData) {
    if (!initData.callContext) initData.callContext = {};
    if (!initData.callContext._jsFileInProgressInd)
        initData.callContext._jsFileInProgressInd = '_phJsFileInProgressind';
    function sub(name, newFunc) {
        var old = initData[name];
        initData[name] = function (data) {
            newFunc(data);
            if (old) old(data, initData.callContext);
        };
    }

    if (initData.getDownloadFileContext) {
        sub('onResourceRequested', function (request) {
            initData.callContext._phFileDownloadRequest = initData.getDownloadFileContext(request, initData.callContext);
        });
    }

    sub('onProcessing', function (page) {
        initData.callContext = page.evaluate(function (callContext) {
            if (callContext._phFileDownloadRequest) {
                var downloadInfo = callContext._phFileDownloadRequest;
                callContext._phFileDownloadRequest = null;
                window[callContext._jsFileInProgressInd] = true;
                //console.log('downloading ' + downloadInfo.url);
                console.log('downloading ====>>>>>>>>>>>' + downloadInfo.postData);
                var xhr = new XMLHttpRequest();
                xhr.open(downloadInfo.method || 'POST', downloadInfo.url, true);
                xhr.responseType = 'arraybuffer';
                xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                xhr.onreadystatechange= function(e) { 
 //console.log('onreadystagechange -------- ' + xhr.readyState);
   };
                xhr.onload = function () {
                    console.log('xhr returned---------------');
                    var data = '';
                    var u8 = new Uint8Array(this.response);
                    for (var i = 0; i < u8.length; i++) {
                        data += ('0' + u8[i].toString(16)).substr(-2);
                    }
                    window.callPhantom({_saveFileData: {data: data}});
                    window[callContext._jsFileInProgressInd] = false;
                };
                if (downloadInfo.postData) xhr.send(downloadInfo.postData);
                console.log('return after file load ' + downloadInfo.postData);
            }
            return callContext;
        }, initData.callContext);
    });
    sub('onCallback', function (data) {
        if (data._saveFileData && data._saveFileData.data && initData.callContext._saveFileName) {
            console.log('debugremove got file data ' + initData.callContext._saveFileName);
            var fileData = data._saveFileData.data;
            try {
                var str = '';
                for (var i = 0; i < fileData.length; i += 2) {
                    var h = parseInt(fileData.substr(i, 2), 16);
                    str += String.fromCharCode(h);
                }
                fs.write(initData.callContext._saveFileName, str, 'wb');
                console.log('done write file ' + initData.callContext._saveFileName);
            } catch (err) {
                console.log('error happened in file save ' + err);
            }
        }
        if (data.phantomExit) {
            phantom.exit();
        }
    });
    var page = createHelper(initData);
    function doProcessing(){
      if (!initData._loadStarted) initData._loadStarted = 0;
      if (!initData._loadFinished) initData._loadFinished = 0;
      if (initData._loadStarted == initData._loadFinished) {
        initData.onProcessing(page, initData.callContext);
      } else {
        //console.log('----- bypassed processing ' + initData._loadStarted+' ' + initData._loadFinished);
      }
      setTimeout(doProcessing, 500);
    };
    setTimeout(doProcessing, 1000);
    return page;
}

module.exports = {
    createHelper : createHelper,
    createDownloadHelper : createDownloadHelper
};
