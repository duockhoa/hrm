import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import { createEbrPresenceConnection } from "./ebr-presence-connection";

function setup() {
  let token: string | null = "first-access-token";
  let listener = () => {};
  let connects = 0;
  let refreshes = 0;
  let socketOptions: Partial<ManagerOptions & SocketOptions> = {};
  const socket = new (class extends EventEmitter {
    connected = false;
    connect() {
      connects++;
      this.connected = true;
      return this;
    }
    disconnect() {
      this.connected = false;
      this.emit("disconnect");
      return this;
    }
    timeout() {
      return this;
    }
    async emitWithAck(event: string) {
      assert.equal(event, "ebr-session:logout");
      return { success: true };
    }
  })();
  const changeToken = (next: string | null) => {
    token = next;
    listener();
  };
  const connection = createEbrPresenceConnection({
    clientSessionId: "persistent-tab-id",
    createSocket: (options) => {
      socketOptions = options;
      return socket as unknown as Socket;
    },
    getAccessToken: () => token,
    subscribeTokens: (callback) => {
      listener = callback;
      return () => {
        listener = () => {};
      };
    },
    refreshAccessToken: async () => {
      refreshes++;
      changeToken("renewed-access-token");
      return "renewed-access-token";
    },
  });
  return {
    connection,
    socket,
    changeToken,
    options: () => socketOptions,
    stats: () => ({ connects, refreshes }),
  };
}

test("sends a stable tab identity and the latest access token on each handshake", () => {
  const state = setup();
  try {
    const auth = state.options().auth;
    assert.equal(typeof auth, "function");
    if (typeof auth !== "function") throw new Error("Missing auth callback");
    auth((payload) =>
      assert.deepEqual(payload, {
        accessToken: "first-access-token",
        clientSessionId: "persistent-tab-id",
      }),
    );
    state.changeToken("updated-token");
    auth((payload) =>
      assert.deepEqual(payload, {
        accessToken: "updated-token",
        clientSessionId: "persistent-tab-id",
      }),
    );
    assert.equal(state.options().forceNew, true);
  } finally {
    state.connection.dispose();
  }
});

test("refreshes expired and legacy tokens once per successful connection", async () => {
  const state = setup();
  try {
    state.socket.emit("connect_error", {
      data: { code: "AUTH_REFRESH_REQUIRED" },
    });
    state.socket.emit("auth:expired");
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(state.stats(), { connects: 2, refreshes: 1 });
    state.socket.emit("ebr-session:ready");
    state.socket.emit("auth:expired");
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(state.stats().refreshes, 2);
  } finally {
    state.connection.dispose();
  }
});

test("does not refresh forbidden credentials or reconnect after logout", async () => {
  const state = setup();
  try {
    state.socket.emit("connect_error", { data: { code: "FORBIDDEN" } });
    assert.equal(state.stats().refreshes, 0);
    assert.equal(await state.connection.logout(), true);
    const count = state.stats().connects;
    state.changeToken("changed-after-logout");
    state.socket.emit("auth:expired");
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(state.stats().connects, count);
    assert.equal(state.socket.connected, false);
  } finally {
    state.connection.dispose();
  }
});

test("disconnects when credentials are cleared and releases listeners on unmount", () => {
  const state = setup();
  state.changeToken(null);
  assert.equal(state.socket.connected, false);
  state.connection.dispose();
  state.changeToken("later-token");
  assert.equal(state.socket.connected, false);
  assert.deepEqual(state.socket.eventNames(), []);
});
