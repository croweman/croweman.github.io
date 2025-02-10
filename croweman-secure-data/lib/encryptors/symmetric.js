// 'use strict'
//
// const crypto = require('crypto'),
//     algorithm = 'aes-256-ctr';
//
// function encrypt(password, text){
//
//     var cipher = crypto.createCipher(algorithm, password)
//     var crypted = cipher.update(text, 'utf8', 'hex')
//     return crypted + cipher.final('hex');
// }
//
// function decrypt(password, text){
//
//     var decipher = crypto.createDecipher(algorithm, password)
//     var dec = decipher.update(text, 'hex', 'utf8')
//     return dec + decipher.final('utf8');
// }
//
// module.exports = {
//     encrypt,
//     decrypt
// }

'use strict'

const crypto = require('crypto'),
    algorithm = 'aes-256-ctr';

function encrypt(password, text){

    var cipher = crypto.createCipher(algorithm, password)
    var crypted = cipher.update(text, 'utf8', 'hex')
    return crypted + cipher.final('hex');
}

function decrypt(password, text){

    var decipher = crypto.createDecipher(algorithm, password)
    var dec = decipher.update(text, 'hex', 'utf8')
    return dec + decipher.final('utf8');
}

module.exports = {
    encrypt,
    decrypt
}