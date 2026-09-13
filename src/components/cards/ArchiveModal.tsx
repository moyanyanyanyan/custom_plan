import { useState } from 'react';
import type { Task } from '../../types/task';
import { CardCollection } from '../CardCollection';
import { ItemCollection } from '../ItemCollection';
import { CardArchiveErrorBoundary } from '../CardArchiveErrorBoundary';
import '../items.css';

import { useAppData } from '../../hooks/useAppData';
import '../collection.css';
type Props = { open: boolean; onClose: () => void; tasks: Task[] };

type ArchiveTab = 'cards' | 'items';

export function ArchiveModal({ open, onClose, tasks }: Props) {
  const [tab, setTab] = useState<ArchiveTab>('cards');
  const { data } = useAppData();
  if (!open) return null;
  return <div className="library-overlay" role="dialog" aria-modal="true" aria-label="发明档案馆"
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="library-panel archive-library" onClick={(event) => event.stopPropagation()}>
      <header><div><span>INVENTION ARCHIVE</span><h2>发明档案馆</h2></div>
        <button onClick={onClose} aria-label="关闭发明档案馆">×</button></header>
      <nav className="archive-tabs" aria-label="档案分类">
        <button className={tab === 'cards' ? 'is-active' : ''} onClick={() => setTab('cards')}>发明卡牌</button>
        <button className={tab === 'items' ? 'is-active' : ''} onClick={() => setTab('items')}>离谱道具</button>
      </nav>
      {tab === 'cards' ? <CardArchiveErrorBoundary><CardCollection cards={data.cards} /></CardArchiveErrorBoundary>
        : <ItemCollection tasks={tasks} />}
    </section>
  </div>;
}
