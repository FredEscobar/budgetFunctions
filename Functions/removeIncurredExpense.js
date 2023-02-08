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

  const commandInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: { ":id": { S: payload.budgetId } },
  };
  const response = await ddbClient.send(new QueryCommand(commandInput));

  const budget = unmarshall(response.Items[0]);

  const newIncurredExpensesItems = budget.incurredExpenses.items.filter(
    (ee) => ee.id !== payload.incurredExpenseId
  );

  budget.incurredExpenses.items = newIncurredExpensesItems;

  budget.incurredExpenses.totalCS = newIncurredExpensesItems.reduce(
    (acumulator, e) => acumulator + e.amountCS,
    0
  );

  const updateResponse = await ddbClient.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(budget),
    })
  );

  return updateResponse.$metadata.httpStatusCode;
};
