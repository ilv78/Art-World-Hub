import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ArtworkWithArtist } from '@shared/schema';

interface CartItem {
  artwork: ArtworkWithArtist;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (artwork: ArtworkWithArtist) => void;
  removeItem: (artworkId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (artwork) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.artwork.id === artwork.id
          );
          if (existingItem) {
            return state;
          }
          return { items: [...state.items, { artwork, quantity: 1 }] };
        });
      },
      removeItem: (artworkId) => {
        set((state) => ({
          items: state.items.filter((item) => item.artwork.id !== artworkId),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + parseFloat(item.artwork.price) * item.quantity,
          0
        );
      },
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'artverse-cart',
    }
  )
);
