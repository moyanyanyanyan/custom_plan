import type { Slime } from '../../types/slime';
import './slimes.css';

type DisplaySlime = Slime & { wanderingDays: number };

export function SlimeArchive({ open, slimes, onContain, onClose }: {
  open: boolean;
  slimes: DisplaySlime[];
  onContain: (taskId: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const sorted = [...slimes].sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  return <div className="library-overlay" role="dialog" aria-modal="true" aria-label="史莱姆图鉴"
    onClick={onClose}>
    <section className="library-panel" onClick={(event) => event.stopPropagation()}>
      <header><div><span>ANOMALY ARCHIVE</span><h2>史莱姆图鉴</h2></div>
        <button onClick={onClose} aria-label="关闭史莱姆图鉴">×</button></header>
      {!sorted.length && <p className="library-empty">暂未发现过夜任务形成的史莱姆。</p>}
      <div className="slime-grid">{sorted.map((slime) => {
        const contained = Boolean(slime.containedAt);
        return <article className={`slime-card ${contained ? 'contained' : ''}`} key={slime.id}>
          <div className="slime-shape" aria-hidden="true">●</div>
          <div><div className="slime-title"><h3>{slime.name}</h3>
            <span>{contained ? '已收容' : '游荡中'}</span></div>
            <p>{slime.description}</p>
            <dl><dt>来源任务</dt><dd>{slime.sourceTaskName}</dd>
              <dt>发现时间</dt><dd>{new Date(slime.discoveredAt).toLocaleString()}</dd>
              <dt>游荡天数</dt><dd>{slime.wanderingDays} 天</dd></dl>
            {!contained && <button onClick={() => onContain(slime.sourceTaskId)}>完成任务并收容</button>}
          </div>
        </article>;
      })}</div>
    </section>
  </div>;
}
