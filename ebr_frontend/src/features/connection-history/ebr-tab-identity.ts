const STORAGE_KEY = "ebr-client-session-id";
const CHANNEL_NAME = "ebr-tab-identity";

function newSessionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID requires HTTPS; getRandomValues also supports intranet HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// sessionStorage survives reloads but browsers also copy it when duplicating a
// tab. A live owner answers probes so the duplicated tab gets a fresh identity.
export function claimEbrTabIdentity() {
  let id: string;
  try {
    id = sessionStorage.getItem(STORAGE_KEY) || newSessionId();
  } catch {
    id = newSessionId();
  }
  const instance = newSessionId();
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CHANNEL_NAME);
  let owned = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolveIdentity: (value: string) => void;
  const ready = new Promise<string>((resolve) => {
    resolveIdentity = resolve;
  });
  const probe = () => {
    clearTimeout(timer);
    channel?.postMessage({ type: "probe", id, instance });
    timer = setTimeout(
      () => {
        owned = true;
        try {
          sessionStorage.setItem(STORAGE_KEY, id);
        } catch {
          /* In-memory identity still works. */
        }
        resolveIdentity(id);
      },
      channel ? 120 : 0,
    );
  };
  if (channel) {
    channel.onmessage = ({
      data,
    }: MessageEvent<{ type: string; id: string; instance: string }>) => {
      if (disposed || !data || data.id !== id || data.instance === instance)
        return;
      if (data.type === "probe" && (owned || instance < data.instance)) {
        channel.postMessage({ type: "owned", id, instance });
      } else if (
        !owned &&
        (data.type === "owned" ||
          (data.type === "probe" && instance > data.instance))
      ) {
        id = newSessionId();
        probe();
      }
    };
  }
  probe();
  return {
    ready,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      channel?.close();
      resolveIdentity(id);
    },
  };
}
