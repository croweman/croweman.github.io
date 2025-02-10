'use strict'

const fs = require('fs'),
    path = require('path'),
    Entry = require('./models/entry'),
    Group = require('./models/group'),
    symmetric = require('./encryptors/symmetric');

function create(appData) {

    var self = {};
    self.key = appData.key;
    self.directoryPath = appData.directoryPath;

    
    function getGroups() {

        let groups = getFileGroups(getFileInfo());
        groups.sort(compareTitle);

        let sortedGroups = groups.map(group => {

            let groupData = { id: group.id, title: group.title, entries: [] };

            groupData.entries = getEntries(group.id).entries;

            return groupData;
        });

        return sortedGroups;
    }

    function getGroup(groupId) {

        let fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;

        data = JSON.parse(symmetric.decrypt(self.key, data));

        for (var i = 0; i < data.groups.length; i++) {

            let currentGroup = new Group(data.groups[i]);

            if (currentGroup.id === groupId)
                return currentGroup;
        }

       return undefined;
    }

    function addGroup(group) {

        var fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);

        let data = JSON.parse(fileContents).data;
        data = JSON.parse(symmetric.decrypt(self.key, data));
        data.groups.push(new Group(group));
        let encryptedData = symmetric.encrypt(self.key, JSON.stringify(data));
        data = { data: encryptedData };
        fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
    }

    function updateGroup(group) {

        let fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;

        data = JSON.parse(symmetric.decrypt(self.key, data));

        let index = -1;
        let foundGroup = undefined;

        for (var i = 0; i < data.groups.length; i++) {

            let currentGroup = new Group(data.groups[i]);

            if (currentGroup.id === group.id) {

                index = i;
                foundGroup = data.groups[i];
                break;
            }
        }


        if (index !== -1 && foundGroup !== undefined) {
            data.groups[index] = new Group(group);
            let encryptedData = symmetric.encrypt(self.key, JSON.stringify(data));
            data = { data: encryptedData };
            fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
        }
    }

    function removeGroup(group) {

        let fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;

        data = JSON.parse(symmetric.decrypt(self.key, data));

        let index = -1;
        let foundGroup = undefined;

        for (var i = 0; i < data.groups.length; i++) {

            let currentGroup = new Group(data.groups[i]);

            if (currentGroup.id === group.id) {

                index = i;
                foundGroup = data.groups[i];
                break;
            }
        }

        if (index !== -1 && foundGroup !== undefined) {
            data.groups.splice(index, 1);
            let encryptedData = symmetric.encrypt(self.key, JSON.stringify(data));
            data = { data: encryptedData };
            fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
        }
    }

    function getEntries(groupId) {

        let entries = getFileEntries(getFileInfo(), groupId);
        entries.sort(compareTitle);

        let sortedEntries = entries.map(entry => {
            return { id: entry.id, title: entry.title };
        });

        let data = {
            entries: sortedEntries
        };

        return data;
    }

    function getEntry(groupId, id) {

        let fileInfo = getFileInfo();

        let entries = getFileEntries(fileInfo, groupId, id);

        return entries.length > 0 ? entries[0] : undefined;
    }

    function addEntry(groupId, entry) {
        
        var fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;

        data = JSON.parse(symmetric.decrypt(self.key, data));

        for (var i = 0; i < data.groups.length; i++) {

            let currentGroup = new Group(data.groups[i]);

            if (currentGroup.id === groupId) {

                data.groups[i].entries.push(new Entry(entry));
                let encryptedData = symmetric.encrypt(self.key, JSON.stringify(data))
                data = { data: encryptedData };

                fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
                break;
            }

        }

    }

    function updateEntry(groupId, entry) {
        
        let fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;

        data = JSON.parse(symmetric.decrypt(self.key, data));

        let index = -1;
        let group = undefined;

        for (var i = 0; i < data.groups.length; i++) {

            if (data.groups[i].id === groupId) {

                group = data.groups[i];

                for (let j = 0; j < group.entries.length; j++) {

                    let currentEntry = new Entry(group.entries[j]);

                    if (currentEntry.id === entry.id)
                    {
                        index = j;
                        break;
                    }
                }

                break;
            }
        }

        if (index !== -1 && group !== undefined) {
            group.entries[index] = new Entry(entry);
            let encryptedData = symmetric.encrypt(self.key, JSON.stringify(data));
            data = { data: encryptedData };
            fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
        }
    }

    function removeEntry(groupId, entry) {

        let fileInfo = getFileInfo();
        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;

        data = JSON.parse(symmetric.decrypt(self.key, data));

        let index = -1;
        let group = undefined;

        for (var i = 0; i < data.groups.length; i++) {

            if (data.groups[i].id === groupId) {

                group = data.groups[i];

                for (let j = 0; j < group.entries.length; j++) {

                    let currentEntry = new Entry(group.entries[j]);

                    if (currentEntry.id === entry.id)
                    {
                        index = j;
                        break;
                    }
                }

                break;
            }
        }

        if (index !== -1 && group !== undefined) {
            group.entries.splice(index, 1);
            let encryptedData = symmetric.encrypt(self.key, JSON.stringify(data));
            data = { data: encryptedData };
            fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
        }
    }

    function getFileInfo() {

        let filePath = path.normalize(path.join(self.directoryPath, 'data.json'));
        console.log(filePath);
        let fileExists = false;

        try {
            fs.accessSync(filePath);
            fileExists = true;
        }
        catch(ex) {
            try {

                let encryptedData = symmetric.encrypt(self.key, JSON.stringify({ groups: [] } ));
                let data = { data: encryptedData };
                fs.writeFileSync(filePath, JSON.stringify(data));
            }
            catch (ex) {
                console.log(ex);
            }
        }

        return {
            filePath,
            fileExists
        }
    }

    function getFileGroups(fileInfo) {

        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;
        let groups = [];

        data = JSON.parse(symmetric.decrypt(self.key, data));

        for (var i = 0; i < data.groups.length; i++) {
            groups.push(new Group(data.groups[i]));
        }

        return groups;
    }

    function getFileEntries(fileInfo, groupId, id) {

        let fileContents = fs.readFileSync(fileInfo.filePath);
        let data = JSON.parse(fileContents).data;
        let entries = [];

        data = JSON.parse(symmetric.decrypt(self.key, data));

        for (var i = 0; i < data.groups.length; i++) {

            if (data.groups[i].id === groupId) {

                let group = data.groups[i];

                for (var j = 0; j < group.entries.length; j++) {

                    let entry = new Entry(group.entries[j])
;
                    if (!id) {
                        entries.push(entry);
                    }
                    else if (id === entry.id) {
                        entries.push(entry);
                        break;
                    }
                }
                break;
            }
        }

        return entries;
    }

    function compareTitle(a, b) {

        let orderOne = a.title || '';
        let orderTwo = b.title || '';

        if (orderOne < orderTwo)
            return -1;
        if (orderOne > orderTwo)
            return 1;
        return 0;
    }

    function importData(fileContents, encrypted) {

        let fileInfo = getFileInfo();
        let fileData =  JSON.parse(fileContents).data;
        let ennodecryptedData = '';

        if (!encrypted) {
            encryptedData = fileData;
        }
        else {
            let dataToEncrypt = JSON.parse(symmetric.decrypt(self.key, fileData));
            encryptedData = symmetric.encrypt(self.key, JSON.stringify(dataToEncrypt));
        }

        let data = { data: encryptedData };
        fs.writeFileSync(fileInfo.filePath, JSON.stringify(data));
    }

    return {
        getGroup,
        getGroups,
        addGroup,
        updateGroup,
        removeGroup,
        getEntries,
        getEntry,
        addEntry,
        updateEntry,
        removeEntry,
        importData
    };

}

module.exports = create;