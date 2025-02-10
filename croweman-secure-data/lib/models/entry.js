'use strict'

const uuid = require('node-uuid');

function Entry(entry) {
    this.id = entry.id || uuid.v4();
    this.title = entry.title;
    this.userName = entry.userName;
    this.email = entry.email;
    this.password = entry.password;
    this.other = entry.other;
}

module.exports = Entry;