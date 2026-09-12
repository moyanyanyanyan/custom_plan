export type EnchantmentType = 'title' | 'upgrade' | 'cursed' | 'special';

export type Enchantment = {
  name: string;
  type: EnchantmentType;
  effect: string;
  sourceTask: string;
};

export type PixelItem = {
  id: string;
  name: string;
  description: string;
  sourceTask: string;
  earnedAt: string;
  dailyKey: string;
  enchantment: Enchantment | null;
};

export type ItemCollection = {
  items: PixelItem[];
  updatedAt: string;
};

export type ItemMachineState = 'ready' | 'forging' | 'completed';