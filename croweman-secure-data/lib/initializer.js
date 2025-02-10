'use strict'

const fs = require('fs'),
    path = require('path'),
    sha256 = require('./hashers/hmac-sha256');

function Initializer() {

    function initialize(appData) {

        console.log();
        let directoryPath = path.normalize(path.join(__dirname, '..', 'data'));
        
        if (!fs.existsSync(directoryPath)){
            fs.mkdirSync(directoryPath);
        }

        let folderName = cleanseFolderName(sha256.hash(appData.key,  { password: 'aGVsbG93b3JsZA==' }));
        directoryPath =  path.normalize(path.join(directoryPath, folderName));

        if (!fs.existsSync(directoryPath)){
            fs.mkdirSync(directoryPath);
        }

        return directoryPath;
    }

    function cleanup(directoryPath) {
        //fs.unlinkSync(directoryPath);
    }

    function cleanseFolderName(folderName) {

        let cleansedFolderName = '';
        let regex = /^[a-zA-Z0-9]$/;

        for (var i = 0, len = folderName.length; i < len; i++) {

            if (!regex.test(folderName[i])) continue;

            cleansedFolderName += folderName[i];
        }

        return cleansedFolderName;
    }

    return {
        initialize,
        cleanup
    }
}

module.exports = new Initializer();