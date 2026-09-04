import { create } from "zustand";

interface NotificationStore {
    notifications: any[];
    addNotification: (notification: any) => void;
    removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],
    addNotification: (notification) => set((state) => ({ notifications: [...state.notifications, notification] })),
    removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter((notification) => notification.id !== id) })),
}));