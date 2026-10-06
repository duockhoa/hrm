import { create } from "zustand";
import type { Item } from "@/features/items/types";
import itemsService from "@/services/items.service";
import { normalizeSearchText } from "@/lib/search-utils";

export type RawMaterialOption = {
  value: string;
  label: string;
  searchText: string;
};

type RawMaterialsState = {
  items: Item[];
  itemOptions: RawMaterialOption[];
  status: "idle" | "loading" | "ready" | "error";
  loadItems: () => Promise<void>;
};

// Keep this cache in memory so a full application reload starts a new fetch.
const useRawMaterialsStore = create<RawMaterialsState>((set, get) => ({
  items: [],
  itemOptions: [],
  status: "idle",
  loadItems: async () => {
    // Set loading before the request to also deduplicate concurrent mounts.
    if (get().status !== "idle") return;
    set({ status: "loading" });
    try {
      const items: Item[] = await itemsService.fetchRawMaterials();
      const rawMaterials = items.filter(
        (item) =>
          !item.item_code.startsWith("TP") &&
          !item.item_code.startsWith("BTP"),
      );
      set({
        items: rawMaterials,
        itemOptions: rawMaterials.map((item) => {
          const label = item.item_name
            ? `${item.item_name} (${item.item_code})`
            : item.item_code;
          return {
            value: item.item_code,
            label,
            searchText: normalizeSearchText(label),
          };
        }),
        status: "ready",
      });
    } catch {
      set({ status: "error" });
    }
  },
}));

export default useRawMaterialsStore;
