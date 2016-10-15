var qa = require('./qa.json');
var fs = require('fs');
var _ = require('lodash');
var phantomHelper = require('./phantomHelper');


function doStage(page, globalState) {
    console.log('doing stage ' + globalState.stage);
    //var args = system.args;
    if (fs.isFile('passcode.txt')) {
        globalState.passcode = fs.read('passcode.txt');
        if (globalState.passcode && globalState.passcode.length)console.log('got passcode ' + globalState.passcode);
    }
    var retstate = page.evaluate(function (globalState) {
        var dirName = 'vanpdfs/';
        function getFileName(row) {
            var dateSpt = row[0].innerHTML.split('/'); //mm/dd/yyyy
            var date = dateSpt[2] + dateSpt[0] + dateSpt[1];
            var name = row[1].innerHTML.replace('&amp;','_').replace(/[^A-Za-z0-9_]*/g, '');
            return 'VAN_' + date + '_' + name + '.pdf';
        }
        try{
            var unamel= document.getElementById('USER');
            if (unamel && globalState.stage == 0) {
                //login
                unamel.value = globalState.cr.ua;
                document.getElementById('PASSWORD').value= globalState.cr.pw;
                console.log('JS:Login');
                document.getElementById('login').click();
                globalState.stage = 1;
            } else if (globalState.stage == 1 ){
                if (document.getElementById('LoginForm:ANSWER')) {
                    console.log('JS:challenge answer');
                    if (!globalState.passcode || globalState.passcode == '') return globalState;
                    globalState.stage = 2;
                    console.log('JS:clicking save cookie');
                    document.getElementById('LoginForm:DEVICE:0').click();
                    var ans = document.getElementById('LoginForm:ANSWER');
                    ans.value = globalState.passcode;                    
                    document.getElementById('LoginForm:ContinueInput').click();
                    console.log('JS:passcode verify');
                } else  {
                    console.log('JS:waiting for passcoce');
                    globalState.stage = 2;
                    window.location = 'https://personal.vanguard.com/us/Statements';
                    return globalState;
                }
            } else if (globalState.stage == 2) {
                globalState.stage = 3;
                //window.location = 'https://personal.vanguard.com/us/Statements';
                //window.location = 'https://personal.vanguard.com/my-accounts/account-overview/balances';
                console.log('JS:redirecting to statements');
            }else if (globalState.stage == 3) {
                if (!window[globalState._jsFileInProgressInd]) {
                    var rows = document.getElementById('StmtSummaryForm:stmtDataTable').children[1].children;
                    for (var i = 1; i < rows.length; i++) {
                        var row = rows[i]                        
                        //if (globalState.documentId == i)
                        {                            
                            var click = row.children[2].children[0].children[0].children[0].children[0].children[0];
                            var fname = getFileName(row.children);                            
                            if (!globalState.savedFiles[fname]) {                                
                                globalState._saveFileName = dirName + fname;                                
                                window[globalState._jsFileInProgressInd] = true;
                                click.click();
                                globalState.savedFiles[fname] = true;
                                console.log('downloading ' + globalState.documentId + ' ' + fname);
                                globalState.stage = 4;
                                break;
                            }                                                        
                        }
                    }
                    if (globalState.stage == 3) {
                        console.log("no more files");
                        window.callPhantom({phantomExit:true});
                    }
                } else console.log('downd in prog');
            }else if (globalState.stage == 4 ) {
                console.log('stage 4 processing is ==--------- ' +window[globalState._jsFileInProgressInd]);
                if(!window[globalState._jsFileInProgressInd]) globalState.stage = 3;

            }
        } catch (exx) {console.log('errro in js '  + exx);}
        //window.callPhantom({phantomExit:true});
        return globalState;
    }, globalState);
    if (retstate) _.assign(globalState, retstate);
    //console.log('end of doStage ' + globalState.stage);
    cnt++;
    //page.render('done' + cnt+'.png');
    page.render('done.png');
}

var cnt = 0;

var myState = {
    callContext : {
        savedFiles : {},
        stage : 0,
        documentId : 1,
        cr: qa.vancr
    },
    url: 'https://investor.vanguard.com/my-account/log-on',
    onProcessing: doStage,
    onConsoleMessage: function (msg) {
        console.log('console==>' + msg);
    },
    onResourceReceived : function(response) {
        //console.log(response.url);
    },
    getDownloadFileContext : function(request, callContext) {
        if (callContext.stage == 3) {
            if (request.url && request.url.indexOf('https://personal.vanguard.com/us/StmtCnfmViewPDFImage?') != -1) {
                console.log('=====>>>>>>DownloadRequest ' + request.url);//+' ' + request.url);
                return {
                    method: 'GET',
                    url: request.url
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
