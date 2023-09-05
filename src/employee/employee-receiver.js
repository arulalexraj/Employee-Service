'use strict';
const common = require('../lib/common');
const db = require('../lib/db.helper');

module.exports.handle_event = async (event) => {
  let isComplete = true;
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      console.log('Received message:', body);

      const employee = {
        employeeID: body.employeeID ? body.employeeID : common.generateGUID(),
        name: body.name,
        age: body.age,
        email: body.email,
        phone: body.phone
      }

      var result = await db.insert('employee', employee);
      console.log('DB Result', result);
    } catch (ex) {
      console.log(ex);
      isComplete = false;
    }

  }
  if (isComplete) {
    return {
      statusCode: 200,
      body: 'Success'
    }
  } else {
    return {
      statusCode: 500,
      body: 'Failure'
    }
  }
};
