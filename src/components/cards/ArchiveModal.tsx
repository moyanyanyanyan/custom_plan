import { CardCollection } from '../CardCollection';

export function ArchiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="library-overlay" role="dialog" aria-modal="true" aria-label="发明档案馆"
    onClick={onClose}>
    <section className="library-panel archive-library" onClick={(event) => event.stopPropagation()}>
      <header><div><span>INVENTION ARCHIVE</span><h2>发明档案馆</h2></div>
        <button onClick={onClose} aria-label="关闭发明档案馆">×</button></header>
      <CardCollection />
    </section>
  </div>;
}
