var qa = require('./qa.json');
var fs = require('fs');
var _ = require('lodash');
var phantomHelper = require('./phantomHelper');


function doStage(page, globalState) {
    console.log('doing stage ' + globalState.stage);
    //var args = system.args;
    if (fs.isFile('passcode.txt')) {
        globalState.passcode = fs.read('passcode.txt');
        console.log('got passcode ' + globalState.passcode);
    }
    var retstate = page.evaluate(function(globalState){
        try{
            var unamel= document.getElementById('USER');
            if (unamel && globalState.stage == 0) {
                //login
                unamel.value = globalState.cr.ua;
                document.getElementById('PASSWORD').value= globalState.cr.pw;
                console.log('username clicking');
                document.getElementById('login').click();
                globalState.stage = 1;
            } else if (globalState.stage == 1 ){
                if (document.getElementById('LoginForm:ANSWER')) {
                    console.log('challenge answer');
                    if (!globalState.passcode || globalState.passcode == '') return globalState;
                    globalState.stage = 2;
                    console.log('clicking save cookie');
                    document.getElementById('LoginForm:DEVICE:0').click();
                    var ans = document.getElementById('LoginForm:ANSWER');
                    ans.value = globalState.passcode;
                    console.log('get input');
                    document.getElementById('LoginForm:ContinueInput').click();
                    console.log('passcode verify');
                } else  {
                    console.log('waiting for passcoce');
                    //globalState.stage = 2;
                    return globalState;
                }
            } else if (globalState.stage == 2) {
                globalState.stage = 3;
                //window.location = 'https://personal.vanguard.com/us/Statements';
                //window.location = 'https://personal.vanguard.com/my-accounts/account-overview/balances';
                console.log('redirecting to statements');
            }
        } catch (exx) {console.log('errro in js '  + exx);}
        //window.callPhantom({exit:true});
        return globalState;
    }, globalState);
    if (retstate) _.assign(globalState, retstate);
    //console.log('end of doStage ' + globalState.stage);
    cnt++;
    page.render('done.png');
}

var cnt = 0;

var myState = {
    callContext : {
        savedFiles : {},
        stage : 0,
        documentId : 0,
        cr: qa.vancr
    },
    url: 'https://investor.vanguard.com/my-account/log-on',
    onProcessing: doStage,
    onConsoleMessage: function (msg) {
        console.log('console==>' + msg);
    },
    getDownloadFileContext : function(request, callContext) {
        if (callContext.stage >= 5) {
            if (request.url && request.url.indexOf('https://secure.bankofamerica.com/mycommunications/statements/retrievedocument.go') != -1) {
                console.log('=====>>>>>>Request ' + request.postData);//+' ' + request.url);
                return {
                    method: 'POST',
                    url: request.url,
                    postData: request.postData
                };
            }

        }
        return false;
    },
    onError : function(msg,trace) {
        console.log('!!!!! Err ' + msg + ' ' + trace);
    }
};

var existing = fs.list('./vanpdfs');
existing.map(function(v){
    if (v.indexOf('VAN') == 0) {
        myState.callContext.savedFiles[v] = true;
    }
});

phantomHelper.createDownloadHelper(myState);
