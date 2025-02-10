#!/usr/bin/env node

const path = require('path'),
    fs = require('fs'),
    express = require('express'),
    contentDisposition = require('content-disposition'),
    pkg = require( path.join(__dirname, 'package.json') ),
    scan = require('./scan'),
    initializer = require('./lib/initializer'),
    bodyParser = require('body-parser'),
    opener = require('opener'),
    readline = require('readline');

// Parse command line options
const { Command } = require('commander');
const program = new Command();

program
    //.version(pkg.version)
    .option('-p, --port <port>', 'Port on which to listen to (defaults to 3000)', parseInt)
    .option('-k, --key <key>', 'Key used for encryption/decryption')
    .option('-n, --keyname <keyname>', 'Key name used for encryption/decryption stored in environment variables')
    .parse(process.argv);

const options = program.opts();

var appData = {
    key: options.key,
    keyname: options.keyname,
    port: options.port || 3000
};

if (appData.key)
    appData.key = appData.key.trim();

if (appData.keyname)
    appData.keyname = appData.keyname.trim();

if (appData.keyname) {
    appData.key = process.env[appData.keyname];
}

if (!appData.key && !appData.keyname) {

    function callback(key) {
        appData.key = key;
        initialize();
    }

    prompt('Please enter a password:', callback);
}
else {
    initialize();
}

function prompt(question, callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.stdoutMuted = true;

    rl.question(question, function(password) {
        rl.close();
        callback(password);
    });

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted)
            rl.output.write("*");
        else
            rl.output.write(stringToWrite);
    };
}

function initialize() {

    if (!validateCommandLineArguments(appData)) {
        process.exit();
        return;
    }

    appData.directoryPath = initializer.initialize(appData);
    global.appData = appData;
    var entryManager = require('./lib/entry-manager')(appData);

    var tree = scan('.', 'files');
    var app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use('/', express.static(path.join(__dirname, 'frontend')));

    function nocache(req, res, next) {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        next();
    }

    app.use('/files', nocache, express.static(process.cwd(), {
        index: false,
        setHeaders: function (res, path) {

            // Set header to force files to download
            res.setHeader('Content-Disposition', contentDisposition(path))

        }
    }));

    app.get('/scan', nocache, function (req, res) {
        res.send(tree);
    });

    app.get('/groups', nocache, function (req, res) {

        var groups = entryManager.getGroups();
        res.send(groups);
    });

    app.post('/addGroup', nocache, function (req, res) {

        entryManager.addGroup(req.body);
        res.send({});

    });

    app.get('/getGroup/:id', nocache, function (req, res) {

        var group = entryManager.getGroup(req.params.id);

        if (group)
            res.send(group);
        else
            res.sendStatus(404);

    });

    app.post('/updateGroup/:id', nocache, function (req, res) {

        var group = entryManager.getGroup(req.params.id);

        if (group) {
            entryManager.updateGroup(req.body);
            res.send({});
        }
        else
            res.sendStatus(404);

    });

    app.post('/removeGroup/:id', nocache, function (req, res) {

        entryManager.removeGroup({id: req.params.id});
        res.send({});

    });

    app.post('/addEntry', nocache, function (req, res) {

        entryManager.addEntry(req.body.groupId, req.body);
        res.send({});

    });

    app.get('/getEntry/:groupId/:id', nocache, function (req, res) {

        var entry = entryManager.getEntry(req.params.groupId, req.params.id);

        if (entry)
            res.send(entry);
        else
            res.sendStatus(404);

    });

    app.post('/updateEntry/:groupId/:id', nocache, function (req, res) {

        var entry = entryManager.getEntry(req.params.groupId, req.params.id);

        if (entry) {
            entryManager.updateEntry(req.params.groupId, req.body);
            res.send({});
        }
        else
            res.sendStatus(404);

    });

    app.post('/removeEntry/:groupId/:id', nocache, function (req, res) {

        entryManager.removeEntry(req.params.groupId, {id: req.params.id});
        res.send({});

    });

    app.get('/download', nocache, function (req, res) {

        var file = path.normalize(path.join(appData.directoryPath, 'data.json'));
        var filename = path.basename(file);
        var mimetype = 'application/json';

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', mimetype);

        var filestream = fs.createReadStream(file);
        filestream.pipe(res);
    });

    app.get('/download-decrypted', nocache, function (req, res) {

        var newFile = path.normalize(path.join(appData.directoryPath, 'data-decrypted.json'));

        var groups = entryManager.getGroups();

        var data = {
            data: {
                groups: groups
            }
        };

        fs.writeFileSync(newFile, JSON.stringify(data, null, 2));

        var filename = path.basename(newFile);
        var mimetype = 'application/json';

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', mimetype);

        var filestream = fs.createReadStream(newFile);
        var stream2 = filestream.pipe(res);

        stream2.on('finish', function () {
            fs.unlinkSync(newFile);
        });
    });

    app.listen(global.appData.port);
    console.log('croweman-secure-data is running on port: ' + global.appData.port);

    opener('http://localhost:' + global.appData.port);

    function validateCommandLineArguments(arguments) {

        if (arguments.key) {

            var key = arguments.key.trim();

            if (key.length < 8 || new RegExp(" ").test(key) || !new RegExp("[a-z]").test(key) || !new RegExp("[A-Z]").test(key) || !new RegExp("[0-9]").test(key)) {
                console.log();
                console.log('You must enter a valid key option (Must be at least 8 characters long, contain at least 1 lower case character, 1 uppercase character and one number).');
                return false;
            }
        }
        else {
            console.log();
            console.log('You must enter a valid key option (Must be at least 8 characters long, contain at least 1 lower case character, 1 uppercase character and one number).');
            return false;
        }

        if (!arguments.port) {
            console.log('You must enter a valid port number');
            return false;
        }

        global.appData = {
            key: arguments.key,
            port: arguments.port
        }

        return true;
    }
}