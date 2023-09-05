'use strict';
const common = require('../lib/common');
const AWS = require('aws-sdk');

module.exports.handle_event = async (event) => {
  const employee = {
    employeeID: event.employeeID ? event.employeeID : common.generateGUID(),
    name: event.name,
    age: event.age,
    email: event.email,
    phone: event.phone
  }
  var sqs = new AWS.SQS();
  var param = {
    QueueUrl:  process.env.QUEUE_URL,
    MessageBody: JSON.stringify(employee)
  }

  let result = await sqs.sendMessage(param).promise();
  
  return {
    statusCode: 200,
    body: result
  }
};
