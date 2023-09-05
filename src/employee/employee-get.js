'use strict';
const db = require('../lib/db.helper');

module.exports.handle_event = async (event) => {
    var result = await db.scan('employee');
    return result;
};
