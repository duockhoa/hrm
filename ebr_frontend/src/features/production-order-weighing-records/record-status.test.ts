import test from "node:test";
import assert from "node:assert/strict";
import { weighingRecordStatusLabel } from "./record-status";

test("shows initialized, QA approved and completed from the actual signatures", () => {
  assert.equal(weighingRecordStatusLabel({ qa_staff_approved_at: null, ipc_staff_approved_at: null }), "Khởi tạo");
  assert.equal(weighingRecordStatusLabel({ qa_staff_approved_at: "2026-10-25T01:00:00Z", ipc_staff_approved_at: null }), "ĐBCL duyệt");
  assert.equal(weighingRecordStatusLabel({ qa_staff_approved_at: "2026-10-25T01:00:00Z", ipc_staff_approved_at: "2026-10-25T02:00:00Z" }), "Hoàn thành");
  assert.equal(weighingRecordStatusLabel({ qa_staff_approved_at: null, ipc_staff_approved_at: "2026-10-25T02:00:00Z" }), "Hoàn thành");
});
