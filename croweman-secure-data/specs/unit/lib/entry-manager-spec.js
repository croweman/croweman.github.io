'use strict'

require('should');

const fs = require('fs'),
    path = require('path'),
    Entry = require('../../../lib/models/entry'),
    Group = require('../../../lib/models/group'),
    initializer = require('../../../lib/initializer');

describe('entry manager', function() {

    var filePath = undefined;
    var appData;
    var entryManager;

    before(function(done) {

        appData = {
            key: 'entry-manager-test-key',
            publicKeyFilePath: './specs/unit/lib/encryptors/public.pem',
            privateKeyFilePath: './specs/unit/lib//encryptors/private.key'
        }

        appData.directoryPath = initializer.initialize(appData);
        filePath = path.resolve(path.join(appData.directoryPath, 'data.json'));

        entryManager = require('../../../lib/entry-manager')(appData);

        deleteDataFile(done);

    });

    afterEach(function(done) {

        deleteDataFile(done);
    });

    function deleteDataFile(done) {
        fs.exists(filePath, function(exists) {
            if(exists)
                fs.unlinkSync(filePath);

            done();
        });
    }

    describe('getGroups', function() {

        before(function(done) {

            var groupOne = new Group({
                title: 'Title 1'
            });

            var groupTwo = new Group({
                title: 'Title 2'
            });

            entryManager.addGroup(groupOne);
            entryManager.addGroup(groupTwo);

            var entry = new Entry({
                title: 'Entry 1'
            });

            entryManager.addEntry(groupOne.id, entry);

            done();
        });

        it('should correctly return all groups', function(done) {

            var allGroups = entryManager.getGroups();
            allGroups.length.should.eql(2);
            allGroups[0].id.length.should.be.greaterThan(0);
            allGroups[0].title.should.eql('Title 1');

            allGroups[0].entries.length.should.eql(1);
            allGroups[0].entries[0].title.should.eql('Entry 1');

            allGroups[1].id.length.should.be.greaterThan(0);
            allGroups[1].title.should.eql('Title 2');

            done();
        });

    });

    describe('getGroup', function() {

        var id;

        before(function(done) {

            var groupOne = new Group({
                title: 'Get group title'
            });

            entryManager.addGroup(groupOne);
            var allGroups = entryManager.getGroups();
            id = allGroups[0].id;

            var entryOne = new Entry({
                title: 'Title 1',
                userName: 'User name 1',
                email: 'Email 1',
                password: 'Password 1',
                other: 'Comments 1'
            });

            entryManager.addEntry(id, entryOne);

            done();
        });

        it('should correctly get a group', function(done) {

            var group = entryManager.getGroup(id);
            group.title.should.eql('Get group title');
            group.entries.length.should.eql(1);
            group.entries[0].title.should.eql('Title 1');

            done();
        });
    });

    describe('addGroup', function() {

        it('should correctly add a group', function(done) {

            var groupOne = new Group({
                title: 'Get group title 1'
            });

            entryManager.addGroup(groupOne);
            var allGroups = entryManager.getGroups();

            allGroups.length.should.eql(1);
            allGroups[0].id.length.should.be.greaterThan(1);
            allGroups[0].title.should.eql('Get group title 1');

            done();

        });
    });

    describe('updateGroup', function() {

        var id;

        before(function(done) {

            var groupOne = new Group({
                title: 'Get group title 1'
            });

            entryManager.addGroup(groupOne);
            var allGroups = entryManager.getGroups();
            id = allGroups[0].id;

            done();
        });

        it('should correctly update a group', function(done) {

            var groupOne = new Group({
                id: id,
                title: 'Get group updated'
            });

            entryManager.updateGroup(groupOne);

            var group = entryManager.getGroup(groupOne.id);

            group.id.should.eql(groupOne.id);
            group.title.should.eql('Get group updated');

            done();

        });

    });

    describe('removeGroup', function() {

        var id;

        before(function(done) {

            var groupOne = new Group({
                title: 'Get group title 1'
            });

            var groupTwo = new Group({
                title: 'Get group title 2'
            });

            var groupThree = new Group({
                title: 'Get group title 3'
            });

            entryManager.addGroup(groupOne);
            entryManager.addGroup(groupTwo);
            entryManager.addGroup(groupThree);

            var allGroups = entryManager.getGroups();
            allGroups.length.should.eql(3);
            id = allGroups[1].id;

            done();
        });

        it('should correctly remove a group', function(done) {

            var group = new Group({
                id: id,
            });

            entryManager.removeGroup(group);

            var allGroups = entryManager.getGroups();
            allGroups.length.should.eql(2);

            done();

        });

    });

    describe('getEntries', function() {

        var id;

        before(function(done) {

            var group = new Group({
                title: 'The title',
            });

            entryManager.addGroup(group);

            var entryOne = new Entry({
                title: 'Title 1',
                userName: 'User name 1',
                email: 'Email 1',
                password: 'Password 1',
                other: 'Comments 1'
            });

            var entryTwo = new Entry({
                title: 'Title 2',
                userName: 'User name 2',
                email: 'Email 2',
                password: 'Password 2',
                other: 'Comments 2'
            });

            id = group.id;
            entryManager.addEntry(group.id, entryOne);
            entryManager.addEntry(group.id, entryTwo);

            done();
        });

        it('should correctly return all entries', function(done) {

            var allEntries = entryManager.getEntries(id);
            allEntries.entries.length.should.eql(2);
            allEntries.entries[0].id.length.should.be.greaterThan(0);
            allEntries.entries[0].title.should.eql('Title 1');
            allEntries.entries[1].id.length.should.be.greaterThan(0);
            allEntries.entries[1].title.should.eql('Title 2');

            done();
        });

    });

    describe('getEntry', function() {

        var groupId;
        var id;

        before(function(done) {

            var group = new Group({
                title: 'The title',
            });

            entryManager.addGroup(group);

            var entry = new Entry({
                title: 'Title',
                userName: 'User name',
                email: 'Email',
                password: 'Password',
                other: 'Comments'
            });


            entryManager.addEntry(group.id, entry);
            var allEntries = entryManager.getEntries(group.id);
            groupId = group.id;
            id = allEntries.entries[0].id;

            done();
        });

        it('should correctly get an entry by id', function(done) {

            var entry = entryManager.getEntry(groupId, id);

            entry.id.should.eql(id);
            entry.title.should.eql("Title");
            entry.userName.should.eql("User name");
            entry.email.should.eql("Email");
            entry.password.should.eql("Password");
            entry.other.should.eql("Comments");

            done();
        });

        it('should return undefined if an entry could not be found', function(done) {

            var entry = entryManager.getEntry('NonExistentId');

            (!entry).should.eql(true);

            done();
        });

    });

    describe('addEntry', function() {

        var groupId;

        before(function(done) {

            var group = new Group({
                title: 'The title',
            });

            entryManager.addGroup(group);
            groupId = group.id;

            done();
        });

        it('should correctly add 1 entry', function(done) {

            var entry = new Entry({
                title: 'The title',
                userName: 'The user name',
                email: 'The email',
                password: 'The password',
                other: 'Some comments about stuff'
            });

            entryManager.addEntry(groupId, entry);

            var allEntries = entryManager.getEntries(groupId);
            allEntries.entries.length.should.eql(1);
            var id = allEntries.entries[0].id;

            var addedEntry = entryManager.getEntry(groupId, id);

            addedEntry.id.should.eql(id);
            addedEntry.title.should.eql(entry.title);
            addedEntry.userName.should.eql(entry.userName);
            addedEntry.email.should.eql(entry.email);
            addedEntry.password.should.eql(entry.password);
            addedEntry.other.should.eql(entry.other);

            done();
        });

    });

    describe('updateEntry', function() {

        var groupId;
        var id;

        before(function(done) {

            var group = new Group({
                title: 'The title',
            });

            entryManager.addGroup(group);
            groupId = group.id;

            var entry = new Entry({
                title: 'Title',
                userName: 'User name',
                email: 'Email',
                password: 'Password',
                other: 'Comments'
            });

            entryManager.addEntry(groupId, entry);
            var allEntries = entryManager.getEntries(groupId);
            id = allEntries.entries[0].id;

            done();
        });

        it('should correctly update an entry', function(done) {

            var entry = entryManager.getEntry(groupId, id);
            entry.id.should.eql(id);
            entry.title.should.eql('Title');

            entry.title = 'Updated title';
            entryManager.updateEntry(groupId, entry);

            var updatedEntry = entryManager.getEntry(groupId, id);
            updatedEntry.id.should.eql(id);
            updatedEntry.title.should.eql('Updated title');

            done();

        });


    });

    describe('removeEntry', function() {

        var groupId;
        var id;

        before(function(done) {

            var group = new Group({
                title: 'The title',
            });

            entryManager.addGroup(group);
            groupId = group.id;

            var entryOne = new Entry({ title: 'Title 1' });

            var entryTwo = new Entry({ title: 'Title 2' });

            var entryThree = new Entry({ title: 'Title 3' });

            entryManager.addEntry(groupId, entryOne);
            entryManager.addEntry(groupId, entryTwo);
            entryManager.addEntry(groupId, entryThree);

            var allEntries = entryManager.getEntries(groupId);
            allEntries.entries.length.should.eql(3)
            id = allEntries.entries[1].id;

            done();
        });

        it('should correctly remove an entry', function(done){

            var entry = entryManager.getEntry(groupId, id);
            entryManager.removeEntry(groupId, entry);

            var allEntries = entryManager.getEntries(groupId);
            allEntries.entries.length.should.eql(2);
            allEntries.entries[0].title.should.eql('Title 1');
            allEntries.entries[1].title.should.eql('Title 3');

            done();

        });

    });

});