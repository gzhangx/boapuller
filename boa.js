var questionAnswers = require('./qa.json');
var fs = require('fs');
var _ = require('lodash');
setTimeout(function() {
  //window.callPhantom({exit:true});
  console.log('timeout, exiting');
  phantom.exit();
}, 120*1000);
var globalState = {
  stage : 0,
  questionAnswers :questionAnswers
};
function doStage(page) {
  var args = system.args;
  var username = args[1];
  var password = args[2];
   globalState = page.evaluate(function(username, password, globalState){
     if(globalState.fileDownloadRequest) {
         var downloadInfo = globalState.fileDownloadRequest;
         globalState.fileDownloadRequest = null;
         console.log('downloading ' + downloadInfo.url);
         console.log('downloading data ' + downloadInfo.postData);
         var xhr = new XMLHttpRequest();
         xhr.open('POST', downloadInfo.url, true);
         xhr.responseType = 'arraybuffer';
         xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
         xhr.onload = function () {
             console.log(typeof this.response);
             var data = '';
             var u8 = new Uint8Array(this.response);
             console.log('---- response text ' + u8.byteLength);
             for (var i = 0; i < u8.length;i++) {
                 data += ('0' + u8[i].toString(16)).substr(-2);
             }
             //console.log(data);
             window.callPhantom({fileData: data});
         };
         xhr.send(downloadInfo.postData);
         console.log('return after file load');
         return globalState;
     }
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
          $("[title='Statements & Documents']")[0].click();
        },0);
        globalState.stage = 4;
        console.log('document clicked');
      } else if (globalState.stage == 4 && $("[id='documentId0']").length) {
        globalState.stage = 5;
          $("[id='documentId0']")[0].click();
          if ($("[id='menuOption3']").length) {
            $("[id='menuOption3']")[0].click();
            globalState.stage = 6;
            console.log('donwload clicked');
          }
        console.log('document id0');
      } else if (globalState.stage == 5 && $("[id='menuOption3']").length) {
        setTimeout(function() {
          $("[id='menuOption3']")[0].click();
        },0);
        globalState.stage = 6;
        console.log('download clicked');
        setTimeout(function() {
          window.callPhantom({exit:true});
        }, 2500);
      }

     //window.callPhantom({exit:true});
     return globalState;
   }, username, password,globalState);
   console.log('end of doStage');
}

var system = require('system');
var page = require('webpage').create();
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36';
page.onConsoleMessage = function(msg) {
  console.log('console ==> ' + msg);
};
page.onError = function(msg,trace) {
  console.log('!!!!! Err ' + msg +  ' ' + trace);
};

var cnt = 0;
page.onCallback = function(data) {
  console.log('inCallback ' + (typeof data));
    if (data.fileData) {
        console.log('got file data');
        try {
            var ary = new Uint8Array(data.fileData.length / 2);
            console.log('got file data ary');
            var str = '';
            for (var i = 0; i < data.fileData.length; i+=2) {
                var h = parseInt(data.fileData.substr(i, 2), 16);
                ary[i / 2] = h;
                str += String.fromCharCode(h);
            }
            console.log('write file');
            fs.write('test.pdf', str, 'w');
            fs.write('out.pdf.txt', data.fileData);
            console.log('done write file');
        } catch (err) {
            console.log('error happened in file save ' + err);
        }
    }
  //console.log('inCallback ' + JSON.stringify(data));
  cnt++;
  page.render('done'+cnt+'.png');
  //phantom.exit();
};

page.onResourceRequested = function(request) {
  if (globalState.stage >= 6) {
    try{
      if (request.url && request.url.indexOf('https://secure.bankofamerica.com/mycommunications/statements/retrievedocument.go') != -1) {
        console.log('Request ' + JSON.stringify(request));
        globalState.fileDownloadRequest = request;
      }
    } catch (e) {console.log('error ' + e);}
  }
  //console.log('Request ' + JSON.stringify(request));
  //console.log('Request ' + (request==null?null:request.url));
  //console.log('.');
};
page.onResourceReceived = function(response) {
  if (globalState.stage >=6) {
     if (response.contentType) console.log(response.contentType);
     var cd = _.find(response.headers, {name:'Content-Disposition'});
     if (cd){
       //console.log(cd.value);
       //console.log(JSON.stringify(response));
     }
  }
  //console.log('Receive ' + JSON.stringify(response, undefined, 4));
  //console.log('x');
};
page.open('https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go', function(status) {
  console.log("Status: " + status);
  if(status === "success") {
  }
});
page.onLoadStarted = function() {
  console.log('load started');
};


page.onLoadFinished = function() {
  cnt++;
  console.log('load finished ' + page.content.length + ' ' + cnt);
  doStage(page);
  //console.log(page.content);
  page.render('done'+cnt+'.png');
};
