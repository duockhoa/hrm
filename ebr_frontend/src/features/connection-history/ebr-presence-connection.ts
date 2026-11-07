import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";

type Options = {
  clientSessionId: string;
  createSocket: (options: Partial<ManagerOptions & SocketOptions>) => Socket;
  getAccessToken: () => string | null;
  subscribeTokens: (listener: () => void) => () => void;
  refreshAccessToken: () => Promise<string>;
};

export function createEbrPresenceConnection(options: Options) {
  let disposed = false;
  let stopped = false;
  let refreshing = false;
  let refreshedSinceReady = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let token = options.getAccessToken();
  const socket = options.createSocket({
    transports: ["websocket"],
    autoConnect: false,
    forceNew: true,
    reconnectionDelayMax: 10_000,
    auth: (callback) =>
      callback({
        accessToken: options.getAccessToken(),
        clientSessionId: options.clientSessionId,
      }),
  });
  const reconnect = () => {
    if (!disposed && !stopped && options.getAccessToken()) socket.connect();
  };
  const retry = () => {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(reconnect, 5_000);
  };
  const renew = async () => {
    if (disposed || stopped || refreshing || refreshedSinceReady) return;
    refreshing = true;
    refreshedSinceReady = true;
    try {
      await options.refreshAccessToken();
      if (!disposed && !stopped) socket.disconnect().connect();
    } catch {
      /* Shared auth flow handles failed refreshes. */
    } finally {
      refreshing = false;
    }
  };
  socket.on("ebr-session:ready", () => {
    refreshedSinceReady = false;
  });
  socket.on("auth:expired", () => {
    void renew();
  });
  socket.on("ebr-session:retry", retry);
  socket.on("ebr-session:ended", () => {
    // A server restart or lease expiry can finalize an old session.
    retry();
  });
  socket.on("connect_error", (error: Error & { data?: { code?: string } }) => {
    const code = error.data?.code;
    if (code === "AUTH_EXPIRED" || code === "AUTH_REFRESH_REQUIRED")
      void renew();
    else if (code === "UNAVAILABLE") retry();
  });
  const unsubscribe = options.subscribeTokens(() => {
    const next = options.getAccessToken();
    if (next === token) return;
    token = next;
    socket.disconnect();
    if (!refreshing) reconnect();
  });
  reconnect();
  return {
    async logout() {
      stopped = true;
      clearTimeout(retryTimer);
      if (socket.connected) {
        try {
          const result = (await socket
            .timeout(2_000)
            .emitWithAck("ebr-session:logout")) as { success?: boolean };
          return result?.success === true;
        } catch {
          /* Fall back to REST when no acknowledgement arrives. */
        } finally {
          socket.disconnect();
        }
      }
      socket.disconnect();
      return false;
    },
    dispose() {
      disposed = true;
      clearTimeout(retryTimer);
      unsubscribe();
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
