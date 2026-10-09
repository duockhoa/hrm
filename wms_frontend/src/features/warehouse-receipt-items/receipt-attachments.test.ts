import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyReceiptImages,
  saveReceiptImages,
  validateReceiptImages,
  type ReceiptAttachment,
  type ReceiptAttachmentType,
} from "./receipt-attachments";
import { getOriginalImageUrl } from "../../lib/image-url";

const image = (name = "image.jpg", type = "image/jpeg", size = 1) =>
  new File([new Uint8Array(size)], name, { type });

const attachment = (
  id: number,
  type: ReceiptAttachmentType,
): ReceiptAttachment => ({
  id,
  warehouse_receipt_item_id: 42,
  attachment_type: type,
  file_path: `/warehouse-receipt-items/attachment-files/${id}.jpg`,
  original_name: `${id}.jpg`,
  mime_type: "image/jpeg",
  file_size: 1,
  uploaded_by_id: 7,
  uploadedBy: { id: 7, name: null, username: "tester" },
  created_at: "2026-10-09T00:00:00Z",
});

test("accepts each supported format and ten images up to 5 MB", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"])
    assert.equal(validateReceiptImages([image("image", type)]), null);
  assert.equal(
    validateReceiptImages([image("image.jpg", "image/jpeg", 5 * 1024 * 1024)]),
    null,
  );
  assert.equal(
    validateReceiptImages(Array.from({ length: 10 }, () => image())),
    null,
  );
  assert.equal(validateReceiptImages([]), null);
});

test("rejects unsupported, empty, oversized images and excessive counts before saving", () => {
  assert.match(
    validateReceiptImages([image("document.pdf", "application/pdf")])!,
    /JPG/,
  );
  assert.match(
    validateReceiptImages([image("empty.jpg", "image/jpeg", 0)])!,
    /không có dữ liệu/,
  );
  assert.match(
    validateReceiptImages([
      image("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
    ])!,
    /5 MB/,
  );
  assert.match(
    validateReceiptImages(Array.from({ length: 11 }, () => image()))!,
    /10/,
  );
  assert.match(validateReceiptImages([image("a".repeat(256))])!, /255/);
});

test("uploads each document category before deleting old images", async () => {
  const pending = emptyReceiptImages();
  pending.dispatch_note = [image("dispatch.jpg")];
  pending.coa = [image("coa-1.jpg"), image("coa-2.jpg")];
  pending.invoice = [image("invoice.jpg")];
  const events: string[] = [];
  await saveReceiptImages({
    receiptId: 42,
    pending,
    removedIds: [5],
    api: {
      upload: async (id, type, files) => {
        assert.equal(id, 42);
        assert.equal(files, pending[type]);
        events.push(type);
        return [attachment(100, type)];
      },
      delete: async (id, attachmentId) => {
        assert.equal(id, 42);
        events.push(`delete:${attachmentId}`);
      },
    },
    onUploaded: (type, images) => {
      assert.equal(images[0].attachment_type, type);
      events.push(`saved:${type}`);
    },
    onDeleted: (id) => events.push(`deleted:${id}`),
  });
  assert.deepEqual(events, [
    "dispatch_note",
    "saved:dispatch_note",
    "coa",
    "saved:coa",
    "invoice",
    "saved:invoice",
    "delete:5",
    "deleted:5",
  ]);
});

test("an upload failure keeps successful progress and retries only remaining categories", async () => {
  const pending = emptyReceiptImages();
  pending.dispatch_note = [image()];
  pending.coa = [image()];
  pending.invoice = [image()];
  const calls: string[] = [];
  let fail = true;
  const options = {
    receiptId: 42,
    pending,
    removedIds: [5],
    api: {
      upload: async (id: number, type: ReceiptAttachmentType) => {
        assert.equal(id, 42);
        calls.push(type);
        if (fail && type === "coa") throw new Error("upload failed");
        return [attachment(100, type)];
      },
      delete: async () => {
        calls.push("delete");
      },
    },
    onUploaded: (type: ReceiptAttachmentType) => {
      pending[type] = [];
    },
    onDeleted: () => {},
  };
  await assert.rejects(saveReceiptImages(options), /upload failed/);
  assert.deepEqual(calls, ["dispatch_note", "coa"]);
  assert.equal(pending.dispatch_note.length, 0);
  assert.equal(pending.coa.length, 1);
  assert.equal(pending.invoice.length, 1);
  fail = false;
  await saveReceiptImages(options);
  assert.deepEqual(calls, ["dispatch_note", "coa", "coa", "invoice", "delete"]);
});

test("deletion failure preserves the remaining queue without uploading images again", async () => {
  const pending = emptyReceiptImages();
  pending.coa = [image()];
  const calls: string[] = [];
  let remaining = [1, 2];
  let fail = true;
  const api = {
    upload: async () => {
      calls.push("upload");
      return [attachment(100, "coa")];
    },
    delete: async (_id: number, id: number) => {
      calls.push(`delete:${id}`);
      if (fail && id === 2) throw new Error("delete failed");
    },
  };
  const save = () =>
    saveReceiptImages({
      receiptId: 42,
      pending,
      removedIds: remaining,
      api,
      onUploaded: (type) => {
        pending[type] = [];
      },
      onDeleted: (id) => {
        remaining = remaining.filter((value) => value !== id);
      },
    });
  await assert.rejects(save(), /delete failed/);
  assert.deepEqual(remaining, [2]);
  fail = false;
  await save();
  assert.deepEqual(calls, ["upload", "delete:1", "delete:2", "delete:2"]);
  assert.deepEqual(remaining, []);
});

test("saving with no image changes makes no attachment requests", async () => {
  await saveReceiptImages({
    receiptId: 42,
    pending: emptyReceiptImages(),
    removedIds: [],
    api: {
      upload: async () => {
        assert.fail("unexpected upload");
      },
      delete: async () => {
        assert.fail("unexpected deletion");
      },
    },
    onUploaded: () => {
      assert.fail("unexpected upload callback");
    },
    onDeleted: () => {
      assert.fail("unexpected delete callback");
    },
  });
});

test("previewing a thumbnail requests the original while preserving other URL parameters", () => {
  const url = new URL(
    getOriginalImageUrl(
      "/attachment-files/photo.jpg?thumbnail=true&token=abc#page-1",
    ),
    "http://localhost",
  );
  assert.equal(url.searchParams.has("thumbnail"), false);
  assert.equal(url.searchParams.get("original"), "true");
  assert.equal(url.searchParams.get("token"), "abc");
  assert.equal(url.hash, "#page-1");
  assert.equal(getOriginalImageUrl(null), null);
  assert.equal(getOriginalImageUrl(undefined), undefined);
});
