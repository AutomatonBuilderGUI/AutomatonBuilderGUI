// Regression test for issue #293: the "Add Comment Region" tool is
// advertised as [C] in the toolbox, so KeyC must select Tool.Comment.
//
// The TypeScript source is compiled to tests/.build before the test run:
//   npx tsc src/Tool.ts src/toolShortcuts.ts --module commonjs --target es2019 \
//     --outDir tests/.build
//   node --test tests/toolShortcuts.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { toolForShortcut } = require(
  path.join(here, ".build", "toolShortcuts.js"),
);
const { Tool } = require(path.join(here, ".build", "Tool.js"));

test("KeyC selects the comment region tool advertised as [C]", () => {
  assert.equal(toolForShortcut("KeyC"), Tool.Comment);
});

test("the other advertised tool shortcuts still map correctly", () => {
  assert.equal(toolForShortcut("KeyA"), Tool.States);
  assert.equal(toolForShortcut("KeyT"), Tool.Transitions);
  assert.equal(toolForShortcut("KeyS"), Tool.Select);
  assert.equal(toolForShortcut("KeyB"), Tool.SelectBox);
});

test("unrelated keys do not select a tool", () => {
  assert.equal(toolForShortcut("KeyR"), undefined);
  assert.equal(toolForShortcut("Escape"), undefined);
});
