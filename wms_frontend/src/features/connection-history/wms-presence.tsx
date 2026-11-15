"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import axiosClient, { refreshAccessToken } from "@/lib/axios-client";
import { getTokenCache, subscribeTokenCache } from "@/store/token.store";
import { CONNECTION_HISTORY_URL } from "./connection-history.service";
import { createWmsPresenceConnection } from "./wms-presence-connection";
import { claimWmsTabIdentity } from "./wms-tab-identity";

let logoutPresence: (() => Promise<void>) | undefined;

export async function endWmsPresenceOnLogout() {
  await logoutPresence?.();
}

// Mount once, inside the application access guard and above changing routes.
export default function WmsPresence() {
  useEffect(() => {
    let disposed = false;
    let connection: ReturnType<typeof createWmsPresenceConnection> | undefined;
    const identity = claimWmsTabIdentity();
    const end = async () => {
      disposed = true;
      if (await connection?.logout()) return;
      const clientSessionId = await identity.ready;
      try {
        await axiosClient.post(
          `${CONNECTION_HISTORY_URL}/end`,
          { client_session_id: clientSessionId },
          { timeout: 5_000 },
        );
      } catch {
        // Offline logout is finalized through the server's stale-session sweep.
      }
    };
    logoutPresence = end;
    void identity.ready.then((clientSessionId) => {
      if (disposed) return;
      const base = new URL(
        process.env.NEXT_PUBLIC_BACKEND_API_URL || window.location.origin,
        window.location.origin,
      );
      connection = createWmsPresenceConnection({
        clientSessionId,
        createSocket: (options) =>
          io(`${base.origin}/wms-presence`, {
            ...options,
            path: `${base.pathname.replace(/\/$/, "")}/socket.io`,
          }),
        getAccessToken: () => getTokenCache().accessToken,
        subscribeTokens: subscribeTokenCache,
        refreshAccessToken,
      });
    });
    return () => {
      disposed = true;
      if (logoutPresence === end) logoutPresence = undefined;
      connection?.dispose();
      identity.dispose();
    };
  }, []);
  return null;
}
