'use strict'

const uuid = require('node-uuid');

function Group(group) {
    this.id = group.id || uuid.v4();
    this.title = group.title;
    this.entries = group.entries || [];
}

module.exports = Group;