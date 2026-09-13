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
  panelMode: 'standard' | 'compact';
  username: string;
  avatarAssetId: string | null;
  wallpaperAssetId: string | null;
  panelOpacity: number;
  soundEnabled: boolean;
  stepfunApiKey: string;
  theme: ThemeSettings;
}

export type UserAssetKind = 'avatar' | 'wallpaper';

export interface PendingUserAsset {
  file: File;
  previewSource: string;
}

export interface CropTarget {
  kind: UserAssetKind;
  file: File;
  source: string;
}

export interface CropTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface CropResult extends PendingUserAsset {}
