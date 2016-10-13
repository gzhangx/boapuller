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

}

module.exports = {
    createHelper : createHelper
};