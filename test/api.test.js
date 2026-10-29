const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../app");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test("health endpoint reports API and database state", async () => {
  const response = await fetch(`${baseUrl}/api/test`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.message, "SkillSwap Hub API is working!");
  assert.ok(["connected", "disconnected"].includes(body.database));
});

test("unknown API paths return the documented JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, { message: "API route not found." });
});

test("database-backed routes return 503 while MongoDB is disconnected", async () => {
  const response = await fetch(`${baseUrl}/api/profile/not-an-id`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.message, /Database is not connected/);
});