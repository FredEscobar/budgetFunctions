import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = "Budget";

export const handler = async function (event, context) {
  const ddbClient = new DynamoDBClient();

  let payload = {};

  if (event.body && typeof event.body === "string") {
    /* 
        In AWS Lambda Function URL the request is wrapped in a custom object and passed as a string in a body property
        so I need to remove break lines and parse it to a JSON object
        */
    payload = JSON.parse(event.body.replace(/\r?\n|\r/g, ""));
  } else {
    //This is for local development where I pass the request as plain javascript object from the caller
    payload = event;
  }

  const response = await ddbClient.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: { id: { S: payload.budgetId }, year: { N: payload.year } },
    })
  );

  return response.$metadata.httpStatusCode;
};
