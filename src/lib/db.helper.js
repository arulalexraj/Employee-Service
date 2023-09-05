const AWS = require('aws-sdk');
let dynamodb = false;
const dbSettings = {
    apiVersion: '2012-08-10'
}

//config for locally ???
exports.config = (strProfile = null, strRegion = "eu-central-1") => {
    if(strProfile) {
        AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: strProfile});
    }
    if(strRegion) {
        AWS.config.region = strRegion;
    }
}

function lazyLoadingDDB()
{
    if(dynamodb === false){
        try {
            dynamodb = new AWS.DynamoDB(dbSettings);
        }
        catch(err) {
            throw "Cant load dynamoDB :: " + err.message;
        }
    }
    return true;
}

const generateUpdateExpression = (objUpdate, objNames, objValues) => {
    if(objUpdate === null || objUpdate === undefined || Object.keys(objUpdate).length === 0) {
        return null;
    }
    let arSets = [];
    let arAdds = [];
    let arDels = [];
    let nIndex = Object.keys(objNames).length + 1;

    for (let key in objUpdate) {
        let keyRef = "key" + nIndex.toString();
        let keyValue = objUpdate[key];
        let queryValue = AWS.DynamoDB.Converter.input(keyValue);
        if (key.startsWith("++")) {
            //if_not_exists(my_list2, :empty_list)
            arSets.push("#" + keyRef + " = list_append(if_not_exists(#" + keyRef + ", :empty_list), :" + keyRef + ")");
            objValues[':empty_list'] = {"L": []};
            if (!Array.isArray(keyValue))
                queryValue = AWS.DynamoDB.Converter.input([keyValue]);
            key = key.substr(2);
        }
        else if (key.startsWith("+#")) {
            arAdds.push("#" + keyRef + " :" + keyRef);
            key = key.substr(2);
        }
        else if (key.startsWith("+")) {
            arAdds.push("#" + keyRef + " :" + keyRef);
            if (Array.isArray(keyValue))
                queryValue = {"SS": keyValue};
            else
                queryValue = {"SS": [keyValue.toString()]};
            key = key.substr(1);
        }
        else if (key.startsWith("-")) {
            arDels.push("#" + keyRef + " :" + keyRef);
            if (Array.isArray(keyValue))
                queryValue = {"SS": keyValue};
            else
                queryValue = {"SS": [keyValue.toString()]};
            key = key.substr(1);
        }
        else if (key.startsWith("!")) {
            //Price = if_not_exists(Price, :p)
            arSets.push("#" + keyRef + " = if_not_exists(#" + keyRef + ", :" + keyRef + ")");
            key = key.substr(1);
        }
        else {
            arSets.push("#" + keyRef + " = :" + keyRef);
        }
        objValues[":"+keyRef] = queryValue;
        objNames["#"+keyRef] = key;
        nIndex++;
    }
    let strExpression = "";
    if (arSets.length > 0) {
        strExpression += 'SET ' + arSets.join(",");
        strExpression += ' ';
    }
    if (arAdds.length > 0) {
        strExpression += 'ADD ' + arAdds.join(",");
        strExpression += ' ';
    }
    if (arDels.length > 0) {
        strExpression += 'DELETE ' + arDels.join(",");
    }
    return strExpression;
};

const generateConditionExpression = (objUpdate, objNames, objValues) => {
    if(objUpdate === null || objUpdate === undefined || Object.keys(objUpdate).length === 0) {
        return null;
    }
    let arSets = [];
    let nIndex = Object.keys(objNames).length + 1;

    for (let key in objUpdate) {
        let keyRef = "key" + nIndex.toString();
        objValues[":"+keyRef] = AWS.DynamoDB.Converter.input(objUpdate[key]);
        if (key.startsWith("=")) {
            arSets.push("#" + keyRef + " = :" + keyRef);
            key = key.substr(1);
        }
        else if (key.startsWith(">=")) {
            arSets.push("#" + keyRef + " >= :" + keyRef);
            key = key.substr(2);
        }
        else if (key.startsWith("<=")) {
            arSets.push("#" + keyRef + " <= :" + keyRef);
            key = key.substr(2);
        }
        else if (key.startsWith(">")) {
            arSets.push("#" + keyRef + " > :" + keyRef);
            key = key.substr(1);
        }
        else if (key.startsWith("<")) {
            arSets.push("#" + keyRef + " < :" + keyRef);
            key = key.substr(1);
        }
        else if (key.startsWith("#")) {
            arSets.push("begins_with (#" + keyRef + "," + keyRef + ")");
            key = key.substr(1);
        }
        else if (key.startsWith("!")) {
            arSets.push("attribute_not_exists(#" + keyRef + ")");
            key = key.substr(1);
            delete objValues[":"+keyRef];
        }
        else if (key.startsWith("?")) {
            arSets.push("attribute_exists(#" + keyRef + ")");
            key = key.substr(1);
            delete objValues[":"+keyRef];
        }
        else {
            arSets.push("#" + keyRef + " = :" + keyRef);
        }
        objNames["#"+keyRef] = key;
        nIndex++;
    }
    return arSets.join(" AND ");
};

const convertResults = async (objResult) => {
    let arrResult = [];
    for (let i = 0; i < objResult.Items.length; i++) {
        arrResult.push(AWS.DynamoDB.Converter.unmarshall(objResult.Items[i]));
    }
    return arrResult;
}

exports.update = (strTable, objKey, objUpdate, objConditions=null) => {
    console.log('key', objKey, objUpdate);
    lazyLoadingDDB();
    let objNames = {};
    let objValues = {};
    let strExpression = generateUpdateExpression(objUpdate, objNames, objValues);
    const params = {
        TableName: strTable,
        Key: AWS.DynamoDB.Converter.marshall(objKey),
        ReturnValues: 'ALL_NEW',
        ExpressionAttributeNames: objNames,
        ExpressionAttributeValues: objValues,
        UpdateExpression: strExpression
    };
    if(objConditions !== null){
        let strCondExperssion = generateConditionExpression(objConditions, objNames, objValues);
        params.ExpressionAttributeNames = objNames;
        params.ExpressionAttributeValues = objValues;
        params.ConditionExpression = strCondExperssion;
    }
    console.log(params);
    return dynamodb.updateItem(params).promise()
        .then(v => {
            if (v.Attributes !== null && v.Attributes !== undefined) {
                return AWS.DynamoDB.Converter.unmarshall(v.Attributes);
            }
            else {
                return "Update Successful.";
            }
        })
};

exports.scan = function (strTable, objConditions=null, objOptions=null) {
    lazyLoadingDDB()
    let params = {
        TableName: strTable,
    }
    if(objConditions) {
        let objNames = {};
        let objValues = {};
        params.FilterExpression = generateConditionExpression(objConditions, objNames, objValues);
        params.ExpressionAttributeValues = objValues;
        params.ExpressionAttributeNames = objNames;
    }
    if(objOptions !== null) {
        for (let key in objOptions) {
            params[key] = objOptions[key];
        }
    }
    //console.log(params);
    return dynamodb.scan(params).promise().then(v => convertResults(v));
};

exports.get = function (strTable, objKey) {
    lazyLoadingDDB() 
    const params = {
        Key: AWS.DynamoDB.Converter.marshall(objKey),
        TableName: strTable
    };
    return dynamodb.getItem(params).promise().then(v => AWS.DynamoDB.Converter.unmarshall(v.Item));
};

exports.query = function (strTable, objKey, objConditions={}, objOptions=null) {
    lazyLoadingDDB()
    let objNames = {};
    let objValues = {};
    let strKeyConditions = generateConditionExpression(objKey, objNames, objValues);
    let strFilterConditions = generateConditionExpression(objConditions, objNames, objValues);
    let objParams = {
        ExpressionAttributeNames: objNames,
        TableName: strTable,
        KeyConditionExpression: strKeyConditions,
        FilterExpression: strFilterConditions,
        ExpressionAttributeValues: objValues
    }
    /*
    if (typeof attributes === 'string' || attributes instanceof String) {
        params["ProjectionExpression"] = attributes;
    }
    */
    if(objOptions !== null) {
        for (let key in objOptions) {
            objParams[key] = objOptions[key];
        }
    }
    return dynamodb.query(objParams).promise().then(v => convertResults(v));
};

exports.insert = (strTable, objValue, strNoReplaceKey=null) => {
    lazyLoadingDDB();
    let objParams = {
        Item: AWS.DynamoDB.Converter.marshall(objValue),
        TableName: strTable
    };
    if (strNoReplaceKey)
        objParams['ConditionExpression'] = 'attribute_not_exists('+strNoReplaceKey+')';
    return dynamodb.putItem(objParams).promise();
}

//this.config();
//this.query("core.authentications.dev.users", {info:"hhh"}, null, {IndexName: "infoSolo"}).then(e=>console.log(e)).catch(e=>console.log(e));
//this.get("core.authentications.dev.users", {userCode:"test", info:"default"}).then(e=>console.log(e)).catch(e=>console.log(e));

exports.batchInsert = (strTable, arValues) => {
    lazyLoadingDDB();
    let objParams = {
        RequestItems: {}
    };
    objParams.RequestItems[strTable] = [];
    arValues.forEach(item => {
        let baseItem = {
            PutRequest: {
                Item: {}
            }
        };
        baseItem.PutRequest.Item = AWS.DynamoDB.Converter.marshall(item);
        objParams.RequestItems[strTable].push(baseItem);
    });
    return dynamodb.batchWriteItem(objParams).promise();
}