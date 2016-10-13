var fs = require('fs');
var str = fs.read('out.pdf.txt');
var u8 = new Uint8Array(str.length/2);
var c = '';
    for (var i = 0; i < u8.length;i++) {
        u8[i] = parseInt(str.substr(i*2, 2),16);
        c+= String.fromCharCode(u8[i]);
    }
fs.write('out.pdf', c,'wb');
