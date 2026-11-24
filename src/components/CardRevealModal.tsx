import type { InventionCard } from '../types/card';
import type { Task } from '../types/task';
import { CardDialog } from './cards/CardDialog';

export function CardRevealModal({ card, open, onClose }: {
  card: InventionCard | null; open: boolean; onClose: () => void; tasks?: Task[];
}) {
  return open && card ? <CardDialog key={card.id} cards={[card]} onClose={onClose} label="新卡揭示" /> : null;
}
