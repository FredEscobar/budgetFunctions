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

  const newIncurredExpensesItems = [
    ...budget.incurredExpenses.items,
    payload.incurredExpense,
  ];

  budget.incurredExpenses.items = newIncurredExpensesItems;

  budget.incurredExpenses.totalCS = newIncurredExpensesItems.reduce(
    (acumulator, e) => acumulator + e.amountCS,
    0
  );

  const incurredExpensesByCategory = budget.incurredExpenses.items.reduce(
    (group, incurredExpense) => {
      const { category } = incurredExpense;
      group[category] = group[category] ?? [];
      group[category].push(incurredExpense);
      return group;
    },
    {}
  );

  let balancesByCategory = [];
  for (var category in incurredExpensesByCategory) {
    balancesByCategory.push({
      categoryId: category,
      amountCS: incurredExpensesByCategory[category].reduce(
        (previous, current) => previous + current.amountCS,
        0
      ),
      amountUSD: 0,
      paidCS: 0,
      balance: 0,
    });
  }

  budget.balancesByCategory = balancesByCategory;

  let balancesByCategoryAndCreditCardData = {};
  for (var category in incurredExpensesByCategory) {
    const incurredExpensesByCreditCard = incurredExpensesByCategory[
      category
    ].reduce((group, incurredExpense) => {
      const { creditCard } = incurredExpense;
      group[creditCard] = group[creditCard] ?? [];
      group[creditCard].push(incurredExpense);
      return group;
    }, {});
    balancesByCategoryAndCreditCardData[category] =
      incurredExpensesByCreditCard;
  }

  let balancesByCategoryAndCreditCard = [];
  for (var category in balancesByCategoryAndCreditCardData) {
    for (var creditCard in balancesByCategoryAndCreditCardData[category]) {
      balancesByCategoryAndCreditCard.push({
        category: category,
        creditCard: creditCard,
        amountCS: balancesByCategoryAndCreditCardData[category][
          creditCard
        ].reduce((previous, current) => previous + current.amountCS, 0),
        amountUSD: 0,
        paidCS: 0,
        balance: 0,
      });
    }
  }

  budget.balancesByCategoryAndCreditCard = balancesByCategoryAndCreditCard;

  const updateResponse = await ddbClient.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(budget),
    })
  );

  return updateResponse.$metadata.httpStatusCode;
};
