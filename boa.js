var questionAnswers = require('./qa.json');
var fs = require('fs');
var _ = require('lodash');
//var system = require('system');
var phantomHelper = require('./phantomHelper');
setTimeout(function() {
  //window.callPhantom({exit:true});
  console.log('timeout, exiting');
  phantom.exit();
}, 120*1000);

function doStage(page, globalState) {
 console.log('doing stage ' + globalState.stage);
  //var args = system.args;
  var username = questionAnswers.cr.ua;
  var password = questionAnswers.cr.pw;
   var retstate = page.evaluate(function(username, password, globalState){
      try{
      var unamel= document.getElementById('enterID-input');
      if (unamel && globalState.stage == 0) {
        //login
        unamel.value = username;
        document.getElementById('tlpvt-passcode-input').value= password;
        console.log('username clicking');
        enterOnlineIDFormSubmit();
        console.log('username clicked');
        //window.callPhantom({exit:false});
        globalState.stage = 1;
      }else if( (document.getElementById('tlpvt-email1') || document.getElementById('rbText1')) && globalState.stage == 1) {
        console.log('email stage found');
        return;
        document.getElementById('rbText1').checked=true;
        globalState.stage = 2;
        setTimeout(function() {
          console.log('phone click start');
          //document.getElementById('btnARContinue').click();
          //document.getElementById('rbText1').checked = true;
          document.getElementById('btnARContinue').click();
          console.log('phone click');
          //setTimeout(function() {
          //  window.callPhantom({exit:true});
          //}, 500);
        },500);
      } else if (globalState.stage == 1 && document.getElementById('tlpvt-challenge-answer')) {
        console.log('challenge answer');
        globalState.stage = 2;
        var ans = document.getElementById('tlpvt-challenge-answer');
        var question = $('label[for="tlpvt-challenge-answer"]').html().trim();
        console.log('question is ' + question);
        ans.value = (globalState.questionAnswers[question]);
        //https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go
        document.VerifyCompForm.action='/login/sign-in/validateChallengeAnswerV2.go';
        $('#VerifyCompForm').submit();
        console.log('submited');
      } else if (globalState.stage == 2 && $('[name=DDA_details]').length) {
        globalState.stage = 3;
        //<a name="DDA_details" href="/myaccounts/brain/redirect.go?source=overview&amp;target=acctDetails&amp;adx=xxx">xxx</a>
        //setTimeout(function(){
          $('[name=DDA_details]')[0].click();
        //}, 500);
        console.log('dda clicked');
      } else if (globalState.stage == 3 && $("[title='Statements & Documents']").length) {
          console.log('stage 3');
          $("[title='Statements & Documents']")[0].click();
          globalState.stage = 4;
          console.log('document tab clicked');
      } else if (globalState.stage == 4 && $("[id='documentId0']").length) {
          globalState.stage = 5;
          if (!window[globalState._jsFileInProgressInd]) {
              var docLink = $('[id=documentId'+globalState.documentId+']');
              if (docLink.length == 0) {
                  console.log('end of documents reached');
                  return;
              }
              var seldate = docLink.parent().parent().children()[0].innerHTML;
              docLink[0].click();
              if ($("[id='menuOption3']").length) {
                  var biggest = null;
                  if (!globalState.savedFiles) globalState.savedFiles = {};
                  var mo3s = $("[id='menuOption3']");
                  for (var moi = 0; moi < mo3s.length; moi++) {
                      var mo3 = mo3s[moi];
                      //console.log('processing mo3 ' + moi + ' ' + mo3.outerHTML + ' ' + (typeof mo3.outerHTML));

                      var mmddyyyy = mo3.outerHTML.match(/\d\d\/\d\d\/\d\d\d\d/)[0];
                      if (mmddyyyy != seldate) continue;
                      console.log('mmddyyyy = ' + mmddyyyy );
                      var yymmdd = (mmddyyyy.substr(6, 4) + mmddyyyy.substr(0, 2)) + mmddyyyy.substr(3, 2);
                      console.log('intval is ' + yymmdd);
                      var iyymmdd = parseInt(yymmdd);
                      var fname = 'BOA_' + iyymmdd + '.pdf';
                      globalState.documentId++;
                      if (!globalState.savedFiles[fname]) {
                          //globalState.savedFiles[fname] = true;
                          globalState._saveFileName = 'pdfs/'+fname;
                          globalState._dictSaveFileName = fname;
                          biggest = mo3;
                          break;
                      }
                  }
                  if (biggest) {
                      //console.log('processing mo3 ' + biggest.outerHTML);
                      globalState.savedFiles[globalState._dictSaveFileName] = true;
                      console.log('download actual click ' + globalState._saveFileName +' ' + globalState.documentId);
                      biggest.click();
                  }

                  console.log('donwload clicked');
              }
          } else {
              console.log('in downloading');
          }
          console.log('document id0');
      }
      else if (globalState.stage == 5 ) {
          console.log('stage 5 processing is ==--------- ' +window[globalState._jsFileInProgressInd]);
          if(!window[globalState._jsFileInProgressInd]) globalState.stage = 4;
         
      }
      } catch (exx) {console.log('errro in js '  + exx);}
     //window.callPhantom({exit:true});
     return globalState;
   }, username, password,globalState);
    if (retstate) _.assign(globalState, retstate);
    //console.log('end of doStage ' + globalState.stage);
    cnt++;
    //page.render('done'+cnt+'.png');
}

var cnt = 0;

var myState = {
    callContext : {
        savedFiles : {},
        stage : 0,
        documentId : 0,
        questionAnswers :questionAnswers
    },
    url: 'https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go',
    onProcessing: doStage,
    onConsoleMessage: function (msg) {
        console.log('console==>' + msg);
    },
    onLoadStarted: function () {
        //console.log('load started');
    },
    onResourceReceived : function(response) {
        if (myState.callContext.stage >= 6) {
            if (response.contentType) console.log(response.contentType);
            var cd = _.find(response.headers, {name: 'Content-Disposition'});
        }
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
    onCallback : function(data) {
        console.log('inCallback ' + (typeof data));
        cnt++;
        page.render('done' + cnt + '.png');
        //phantom.exit();
    },
    onError : function(msg,trace) {
        console.log('!!!!! Err ' + msg + ' ' + trace);
    }
};

var existing = fs.list('./pdfs');
existing.map(function(v){
  if (v.indexOf('BOA') == 0) {
      myState.callContext.savedFiles[v] = true;
      console.log(JSON.stringify(myState.callContext.savedFiles));
  }
});

phantomHelper.createDownloadHelper(myState);
