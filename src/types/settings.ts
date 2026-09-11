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
}

export type UserAssetKind = 'avatar' | 'wallpaper';

export interface PendingUserAsset {
  file: File;
  previewSource: string;
}
