import { create } from "zustand";
import type { Item } from "@/features/items/types";
import itemsService from "@/services/items.service";

type RawMaterialsState = {
  items: Item[];
  status: "idle" | "loading" | "ready" | "error";
  loadItems: () => Promise<void>;
};

// Keep this cache in memory so a full application reload starts a new fetch.
const useRawMaterialsStore = create<RawMaterialsState>((set, get) => ({
  items: [],
  status: "idle",
  loadItems: async () => {
    // Set loading before the request to also deduplicate concurrent mounts.
    if (get().status !== "idle") return;
    set({ status: "loading" });
    try {
      const items: Item[] = await itemsService.fetchRawMaterials();
      set({
        items: items.filter(
          (item) =>
            !item.item_code.startsWith("TP") &&
            !item.item_code.startsWith("BTP"),
        ),
        status: "ready",
      });
    } catch {
      set({ status: "error" });
    }
  },
}));

export default useRawMaterialsStore;
