import './avatar.css';

/** 使用本地几何头像，确保首版不依赖外部图片服务。 */
export function AvatarArt() {
  return <span className="avatar-art" aria-hidden="true">
    <span className="avatar-orbit" /><span className="avatar-head" />
    <span className="avatar-body" /><span className="avatar-spark" />
  </span>;
}
