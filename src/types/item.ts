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
  /** AI 生成的像素图资源 id（与 item.id 同名）。AI 不可用时为空，界面退回首字方块。 */
  imageAssetId?: string | null;
  /** 锻造这件道具时投入的卡牌；未投卡（无卡牌时）为空。 */
  sourceCardId?: string | null;
  sourceCardName?: string | null;
  /** true = 走的是前端降级道具池，不是 AI 生成。 */
  degraded?: boolean;
};

export type ItemCollection = {
  items: PixelItem[];
  updatedAt: string;
};

export type ItemMachineState = 'ready' | 'forging' | 'completed';
