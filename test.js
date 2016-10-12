var questionAnswers = require('qa.txt');
var globalState = {
  stage : 0
};
function doStage(page) {
  var args = system.args;
  var username = args[1];
  var password = args[2];
   globalState = page.evaluate(function(username, password, globalState){
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
          setTimeout(function() {
            window.callPhantom({exit:true});
          }, 500);
        },500);
      } else if (globalState.stage == 1 && document.getElementById('tlpvt-challenge-answer')) {
        console.log('challenge answer');
        globalState.stage = 2;
        var ans = document.getElementById('tlpvt-challenge-answer');
        var questionele = $("input[for='tlpvt-challenge-answer']" );
        console.log(questionele);
        console.log('question is ' + questionele.text());
        //https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go
        document.VerifyCompForm.action='/login/sign-in/validateChallengeAnswerV2.go';
        $('#VerifyCompForm').submit();
      }
      //window.callPhantom({exit:true});
     return globalState;
   }, username, password,globalState);
   console.log('end of first call');
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
  console.log('inCallback ' + data);
  console.log('inCallback ' + JSON.stringify(data));
  cnt++;
  page.render('done'+cnt+'.png');
  phantom.exit();
};

page.onResourceRequested = function(request) {
  //console.log('Request ' + JSON.stringify(request,null,2));
  //console.log('Request ' + (request==null?null:request.url));
  //console.log('.');
};
page.onResourceReceived = function(response) {
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
