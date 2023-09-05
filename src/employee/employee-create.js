'use strict';
const db = require('../lib/db.helper');
const common = require('../lib/common');

module.exports.handle_event = async (event) => {
  const employee = {
    employeeID: event.employeeID ? event.employeeID : common.generateGUID(),
    name: event.name,
    age: event.age,
    email: event.email,
    phone: event.phone
  }
  await db.insert('employee', employee);
  return {
    statusCode: 200,
    body: 'Success'
  }
};