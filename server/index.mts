import assert from "node:assert/strict";

if (process.env.TEST === "kill-the-newsletter") {
  assert.equal(1 + 1, 2);
}
