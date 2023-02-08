import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const TABLE_NAME = "Budget";

function updateTransfersInfo(period) {
  const transfersInfo = period.expectedExpenses.reduce(
    (transfers, expectedExpense) => {
      const { bankId } = expectedExpense;
      transfers[bankId] = transfers[bankId] ?? [];
      transfers[bankId].push(expectedExpense);
      return transfers;
    },
    {}
  );

  const transfers = [];
  for (var bankId in transfersInfo) {
    transfers.push({
      bankId: bankId,
      amount: transfersInfo[bankId].reduce(
        (total, expectedExpense) => total + expectedExpense.valueUSD,
        0
      ),
    });
  }

  period.bankTransfer = {
    total: transfers.reduce(
      (total, bankTransfer) => total + bankTransfer.amount,
      0
    ),
    detail: transfers,
  };

  return period;
}

export const handler = async function (event, context) {
  const ddbClient = new DynamoDBClient();
  let payload = {};

  if (context.awsRequestId) {
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

  const period = budget.periods.find((p) => p.description === payload.period);

  const newExpectedExpenses = period.expectedExpenses.filter(
    (ee) => ee.id !== payload.expectedExpenseId
  );

  period.expectedExpenses = newExpectedExpenses;

  period.incomeSummary.expenses = newExpectedExpenses.reduce(
    (acumulator, e) => acumulator + e.valueUSD,
    0
  );

  const { expenses, available } = period.incomeSummary;
  period.incomeSummary.balance = available - expenses;

  updateTransfersInfo(period);

  const newPeriods = budget.periods.map((p) =>
    p.description === payload["period"] ? period : p
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
