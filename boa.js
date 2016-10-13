var questionAnswers = require('./qa.json');
var fs = require('fs');
var _ = require('lodash');
var system = require('system');
var phantomHelper = require('./phantomHelper');
setTimeout(function() {
  //window.callPhantom({exit:true});
  console.log('timeout, exiting');
  phantom.exit();
}, 120*1000);

function doStage(page, globalState) {
  var args = system.args;
  var username = questionAnswers.cr.ua;
  var password = questionAnswers.cr.pw;
   var retstate = page.evaluate(function(username, password, globalState){

      var unamel= document.getElementById('enterID-input');
     console.log('stage ' + globalState.stage);
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
        setTimeout(function() {
            console.log('doc length = ' + $("[title='Statements & Documents']").length +' ' + $("[title='Statements & Documents']")[0]);
          $("[title='Statements & Documents']")[0].click();
        },0);
        globalState.stage = 4;
        console.log('document clicked');
      } else if (globalState.stage == 4 && $("[id='documentId0']").length) {
        globalState.stage = 5;
          $("[id='documentId0']")[0].click();
          if ($("[id='menuOption3']").length) {
              var biggest = null;
              var biggestVal = 0;
              $("[id='menuOption3']").map(function (cnt,mo3) {
                  console.log('processing mo3 ' + mo3.outerHTML+' ' + (typeof mo3.outerHTML));

                  var mmddyyyy = mo3.outerHTML.match(/\d\d\/\d\d\/\d\d\d\d/)[0];
                  console.log('mmddyyyy = ' + mmddyyyy+ ' ' + (typeof mmddyyyy));
                  var yymmdd = (mmddyyyy.substr(6, 4) + mmddyyyy.substr(0, 2))+ mmddyyyy.substr(3, 2);
                  console.log('intval is ' + yymmdd);
                  var iyymmdd = parseInt(yymmdd);
                  if (iyymmdd > biggestVal) {
                      biggestVal = iyymmdd;
                      biggest = mo3;
                  }
              });
              biggest.click();
              globalState._saveFileName = 'BOA_'+biggestVal+'.pdf';

              globalState.stage = 6;
              console.log('donwload clicked');
              //.match(/\d\d\/\d\d\/\d\d\d\d/)
          }
        console.log('document id0');
      } else if (globalState.stage == 5 && $("[id='menuOption3']").length) {
        setTimeout(function() {
          $("[id='menuOption3']")[0].click();
        },0);
        globalState.stage = 6;
        console.log('download clicked');
      }

     //window.callPhantom({exit:true});
     return globalState;
   }, username, password,globalState);
   _.assign(globalState, retstate);
    console.log('end of doStage ' + globalState.stage);
    cnt++;
    page.render('done'+cnt+'.png');
}

var cnt = 0;


phantomHelper.createDownloadHelper({
    callContext : {
        stage : 0,
        questionAnswers :questionAnswers
    },
    url: 'https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go',
    onLoadFinished: doStage,
    onConsoleMessage: function (msg) {
        console.log('console==>' + msg);
    },
    onLoadStarted: function () {
        console.log('load started');
    },
    onResourceReceived : function(response) {
        if (globalState.stage >= 6) {
            if (response.contentType) console.log(response.contentType);
            var cd = _.find(response.headers, {name: 'Content-Disposition'});
            if (cd) {
                //console.log(cd.value);
                //console.log(JSON.stringify(response));
            }
        }
    },
    onResourceRequested__ : function(request) {
        if (globalState.stage >= 6) {
            try {
                if (request.url && request.url.indexOf('https://secure.bankofamerica.com/mycommunications/statements/retrievedocument.go') != -1) {
                    console.log('Request ' + JSON.stringify(request));
                    globalState.fileDownloadRequest = request;
                }
            } catch (e) {
                console.log('error ' + e);
            }
        }
    },
    getDownloadFileContext : function(request, callContext) {
        if (callContext.stage >= 6) {
                if (request.url && request.url.indexOf('https://secure.bankofamerica.com/mycommunications/statements/retrievedocument.go') != -1) {
                    console.log('Request ' + JSON.stringify(request));
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
});