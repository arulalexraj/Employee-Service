'use strict';
const AWS = require('aws-sdk');

exports.handle_event = async () => {
    AWS.config.update({ region: 'us-east-1' });
    const cloudWatchLogs = new AWS.CloudWatchLogs();
    const s3 = new AWS.S3();

    const params = {
        logGroupName: "/aws/lambda/employee-dev-get",
        from: Date.now() - 24 * 60 * 60 * 1000,
        to: Date.now(),
        destination: 'employee-logger',
        destinationPrefix: 'employee-logger'
    }

    var response = await cloudWatchLogs.createExportTask(params).promise();
    console.log(`Export task created with ID: ${JSON.stringify(response)}`);
} 

const checkBucketExists = async (bucketName) => {
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log(`Bucket '${bucketName}' exists.`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`Bucket '${bucketName}' does not exist.`);
        return false;
      }
      throw error;
    }
  }