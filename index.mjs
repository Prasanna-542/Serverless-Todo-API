import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, PutCommand, GetCommand,
  ScanCommand, UpdateCommand, DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  const id = event.pathParameters?.id;

  try {
    if (method === "POST") {
      const { title } = JSON.parse(event.body);
      const item = { id: randomUUID(), title, done: false };
      await client.send(new PutCommand({ TableName: TABLE, Item: item }));
      return respond(201, item);
    }
    if (method === "GET" && !id) {
      const { Items } = await client.send(
        new ScanCommand({ TableName: TABLE })
      );
      return respond(200, Items);
    }
    if (method === "GET" && id) {
      const { Item } = await client.send(
        new GetCommand({ TableName: TABLE, Key: { id } })
      );
      return Item ? respond(200, Item) : respond(404, { message: "Not found" });
    }
    if (method === "PUT") {
      const { title, done } = JSON.parse(event.body);
      const result = await client.send(new UpdateCommand({
        TableName: TABLE, Key: { id },
        UpdateExpression: "set title = :t, done = :d",
        ExpressionAttributeValues: { ":t": title, ":d": done },
        ReturnValues: "ALL_NEW"
      }));
      return respond(200, result.Attributes);
    }
    if (method === "DELETE") {
      await client.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
      return respond(204, {});
    }
  } catch (err) {
    return respond(500, { message: err.message });
  }
};

const respond = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});