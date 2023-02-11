import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": { S: payload.budgetId } },
    })
  );

  const budget = unmarshall(response.Items[0]);

  const period = budget.periods.find((p) => p.description === payload.period);

  period.exchangeRate = payload.exchangeRate;

  period.expectedExpenses.forEach(
    (ee) =>
      (ee.valueCS = Math.round(ee.valueUSD * payload.exchangeRate * 100) / 100)
  );

  const newPeriods = budget.periods.map((p) =>
    p.description === payload.period ? period : p
  );

  const updatedBudget = {
    ...budget,
    periods: newPeriods,
  };

  const updateResponse = await ddbClient.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(updatedBudget),
    })
  );

  return updateResponse.$metadata.httpStatusCode;
};
