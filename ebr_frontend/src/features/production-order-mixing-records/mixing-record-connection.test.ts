import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import { createMixingRecordConnection } from "./mixing-record-connection";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const setup = (revalidate?: () => Promise<unknown>) => {
  let token: string | null = "access-token";
  let listener = () => {};
  let calls = 0;
  let refreshes = 0;
  let deleted = 0;
  let connects = 0;
  let disconnects = 0;
  let socketOptions: Partial<ManagerOptions & SocketOptions> = {};
  const socket = new (class extends EventEmitter {
    connect() {
      connects++;
      return this;
    }
    disconnect() {
      disconnects++;
      this.emit("disconnect");
      return this;
    }
  })();
  const changeToken = (value: string | null) => {
    token = value;
    listener();
  };
  const connection = createMixingRecordConnection({
    recordId: 1,
    createSocket: (options) => {
      socketOptions = options;
      return socket as unknown as Socket;
    },
    getAccessToken: () => token,
    subscribeTokenCache: (callback) => {
      listener = callback;
      return () => {
        listener = () => {};
      };
    },
    refreshAccessToken: async () => {
      refreshes++;
      changeToken("new-access-token");
      return "new-access-token";
    },
    revalidate: async () => {
      calls++;
      await revalidate?.();
    },
    onDeleted: () => {
      deleted++;
    },
    onConnectionChange: () => {},
  });
  return {
    socket,
    connection,
    changeToken,
    stats: () => ({ calls, refreshes, deleted, connects, disconnects }),
    options: () => socketOptions,
  };
};

test("uses access-token auth and never polls an unchanged record", async () => {
  const state = setup();
  try {
    const auth = state.options().auth;
    assert.equal(typeof auth, "function");
    if (typeof auth === "function")
      auth((payload) =>
        assert.deepEqual(payload, { accessToken: "access-token", recordId: 1 }),
      );
    assert.deepEqual(state.options().transports, ["websocket"]);
    state.socket.emit("mixing-record:ready", { recordId: 1 });
    await wait(300);
    assert.equal(state.stats().calls, 1);
    await wait(2100);
    assert.equal(state.stats().calls, 1);
  } finally {
    state.connection.dispose();
  }
});

test("coalesces local saves and remote changes; ignores other records", async () => {
  const state = setup();
  try {
    state.socket.emit("mixing-record:changed", { recordId: 2 });
    await wait(300);
    assert.equal(state.stats().calls, 0);
    state.connection.requestRefresh();
    for (let index = 0; index < 10; index++)
      state.socket.emit("mixing-record:changed", { recordId: 1 });
    await wait(300);
    assert.equal(state.stats().calls, 1);
    state.socket.emit("mixing-record:changed", { recordId: 1, deleted: true });
    assert.equal(state.stats().deleted, 1);
  } finally {
    state.connection.dispose();
  }
});

test("does not lose changes received during an ongoing REST fetch", async () => {
  let resolveFetch = () => {};
  const blocked = new Promise<void>((resolve) => {
    resolveFetch = resolve;
  });
  const state = setup(() => blocked);
  try {
    state.connection.requestRefresh();
    await wait(300);
    state.socket.emit("mixing-record:changed", { recordId: 1 });
    assert.equal(state.stats().calls, 1);
    resolveFetch();
    await wait(300);
    assert.equal(state.stats().calls, 2);
  } finally {
    resolveFetch();
    state.connection.dispose();
  }
});

test("refreshes expired/legacy credentials once and stops the socket on logout", async () => {
  const state = setup();
  try {
    state.socket.emit("connect_error", {
      data: { code: "AUTH_REFRESH_REQUIRED" },
    });
    state.socket.emit("auth:expired");
    await wait(0);
    assert.equal(state.stats().refreshes, 1);
    assert.equal(state.stats().connects, 2);
    const auth = state.options().auth;
    if (typeof auth === "function")
      auth((payload) => assert.equal((payload as { accessToken: string }).accessToken, "new-access-token"));
    state.changeToken(null);
    assert.equal(state.stats().connects, 2);
    assert.ok(state.stats().disconnects > 0);
  } finally {
    state.connection.dispose();
  }
});

test("disposal cancels pending fetches and token listeners", async () => {
  const state = setup();
  state.connection.requestRefresh();
  state.connection.dispose();
  state.changeToken("another-token");
  await wait(300);
  assert.equal(state.stats().calls, 0);
  assert.equal(state.stats().connects, 1);
  assert.equal(state.socket.listenerCount("mixing-record:changed"), 0);
});
