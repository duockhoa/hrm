import test from "node:test";
import assert from "node:assert/strict";
import { summarizeWeighings } from "./weighing-summary";

test("collects notes from each weighing by code and lists each weigher name once", () => {
  assert.deepEqual(
    summarizeWeighings([
      {
        item_code: "NL02",
        details: [{ id: 3, note: " note B ", weighedBy: { name: "Nguyễn B" } }],
      },
      {
        item_code: "NL01",
        details: [
          { id: 2, note: "  ", weighedBy: { name: " Nguyễn A " } },
          { id: 1, note: "note A", weighedBy: { name: "Nguyễn A" } },
          { id: 4, note: "note C", weighedBy: { name: null, username: "ipc" } },
        ],
      },
    ]),
    {
      notes: "NL01: note A, NL01: note C, NL02: note B",
      weighers: "Nguyễn A, ipc, Nguyễn B",
    },
  );
});

test("handles no weighings, empty notes and missing weigher names", () => {
  assert.deepEqual(summarizeWeighings([]), { notes: "", weighers: "" });
  assert.deepEqual(
    summarizeWeighings([
      { item_code: "NL01", details: [{ id: 1, note: null, weighedBy: null }] },
    ]),
    { notes: "", weighers: "" },
  );
});
