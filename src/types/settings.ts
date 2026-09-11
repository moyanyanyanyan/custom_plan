export interface ThemeSettings {
  primary: string;
  secondary: string;
  accent: string;
  completed: string;
  pending: string;
  text: string;
  cardHighlight: string;
  slimeTint: string;
}

export interface AppSettings {
  avatarAssetId: string | null;
  wallpaperAssetId: string | null;
  panelOpacity: number;
  soundEnabled: boolean;
  theme: ThemeSettings;
  stepfunApiKey: string;
  /** 新手指引是否已完成（走完或跳过均标记为 true）。 */
  onboardingCompleted: boolean;
}

export type UserAssetKind = 'avatar' | 'wallpaper';

export interface PendingUserAsset {
  file: File;
  previewSource: string;
}
