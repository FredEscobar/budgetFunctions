import * as fs from "fs";
// import * as app from "./Functions/removeExpectedExpense.js";
// import * as app from "./Functions/addExpectedExpense.js";
import * as app from "./Functions/addIncurredExpense.js";
// import * as app from "./Functions/removeIncurredExpense.js";
// import * as app from "./Functions/cloneBudget.js";
// import * as app from "./Functions/removeBudget.js";
// import * as app from "./Functions/updatePeriodExchangeRate.js";
import { v4 as uuidv4 } from "uuid";

var event = JSON.parse(
  // fs
  //   .readFileSync("./TestEvents/updatePeriodExchangeRateEvent.json", "utf8")
  //   .trim()
  // fs.readFileSync("./TestEvents/removeBudgetEvent.json", "utf8").trim()
  // fs.readFileSync("./TestEvents/cloneBudgetEvent.json", "utf8").trim()
  // fs.readFileSync("./TestEvents/removeExpectedExpenseEvent.json", "utf8").trim()
  fs.readFileSync("./TestEvents/incurredExpenseEvent.json", "utf8").trim()
  // fs.readFileSync("./TestEvents/addExpectedExpense.json", "utf8").trim()
  // fs.readFileSync("./TestEvents/removeIncurredExpenseEvent.json", "utf8").trim()
);

var context = {};
context.done = function () {
  console.log("Lambda Function complete");
};

// event.id = uuidv4();

const result = await app.handler(event, context);
console.log(result);
