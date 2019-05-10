const steem = require('steem')
const fs = require('fs')
const readline = require('readline');
const colors = require('colors');

var chatapplication = "chat";


//Crypto Settings
var crypto = require('crypto'),
    algorithm = 'aes-256-cbc',
    password = 'dV4574M.3}#MsE($s2&G-/n87_{\(YJX',
    ivv = new Buffer('de522c62f093325e694035d78fec459c')

//Read Line
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var settingsf = fs.readFileSync('info.json');  
var settings = JSON.parse(settingsf);

var startblock = "";
var curblock = "";
var lastblock = "";
var goBack = 10;

function start(){
    genPass(function(err,res){
        if(res){
            input();
            steem.api.getDynamicGlobalProperties(function(err, result) {
                if(result){
                    startblock = result.head_block_number;
                    lastblock = startblock - goBack;
                    setInterval(function() {
                        getMessages();
                    }, 1000);
                }
            });
        }
    });
}

function input(){
    rl.question(settings.user+': ', (msg) => {
        var cryptMessage = encrypt(msg);
        var from = encrypt(settings.user);
        var json = JSON.stringify({data:cryptMessage,from:from});
        steem.broadcast.customJson(settings.key, [], [settings.user], chatapplication, json, function(err, result) {
            if(!result){
                console.error('Failed to send Message');
            }
        });
        input();
    });
}

function getMessages(){
    steem.api.getDynamicGlobalProperties(function(err, result) {
        if(result){
            curblock = result.head_block_number;
            
            for(var i = lastblock; i < curblock; i++){
                getMessage(i);
            }
            lastblock = curblock;
        }
    });
}

function getMessage(block){
    steem.api.getBlock(block, function(err, result) {
        if(result){
            result.transactions.forEach(trx => {
                if(trx.operations[0][0] == "custom_json"){
                    if(trx.operations[0][1].id == chatapplication){
                        var json = JSON.parse(trx.operations[0][1].json);
                        if(json.data && json.from){
                            var data = decrypt(json.data);
                            var from = decrypt(json.from);

                            if(from != settings.user){
                                process.stdout.clearLine();
                                process.stdout.cursorTo(0);
                                console.log((from +": "+ data).green);
                                rl.prompt(true);
                            }
                        }
                    }
                }
            });
        }
    });
}

function genPass(callback){
    var sortedUser = [];
    sortedUser[0] = settings.user;
    sortedUser[1] = settings.contact;

    sortedUser.sort(function(a, b) {
        return a > b;
    });

    if(!settings.iv){
        var ivraw = sortedUser[1] + sortedUser[0];
    }else{
        var ivraw = settings.iv;
    }
    ivv = new Buffer(ivraw)

    if(!settings.psw){
        var sortedUser = [];
        sortedUser[0] = settings.user;
        sortedUser[1] = settings.contact;

        sortedUser.sort(function(a, b) {
            return a > b;
        });

        var pswraw = sortedUser[0] + sortedUser[1];
        password = encrypt(pswraw);

        console.warn('SECURITY ISSUE: You should better set a Password in info.json. Elese everybody with coding-skills will be able to read the Chat'.yellow)
    }else{
        password = encrypt(settings.psw);
    }
    console.log("The generated Password: "+password)
    callback(null,true);
}

function encrypt(text) {
    let iv = ivv.toString('hex').slice(0, 16);
    let key = crypto.createHash('sha256').update(String(password)).digest('base64').substr(0, 32);
    let cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
  
    encrypted = Buffer.concat([encrypted, cipher.final()]);
  
    return iv + ':' + encrypted.toString('hex');
}
  
function decrypt(text) {
    try{
        let textParts = text.split(':');
        let iv = textParts[0];
        let key = crypto.createHash('sha256').update(String(password)).digest('base64').substr(0, 32);
        let encryptedText = new Buffer(textParts[1], 'hex');
        let decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText);
    
        decrypted = Buffer.concat([decrypted, decipher.final()]);
    
        return decrypted.toString();
    }catch(err){

    }
}

start();