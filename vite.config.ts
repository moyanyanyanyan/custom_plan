import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // src-tauri 由 tauri CLI 自己监听；编辑器对 Rust 源做原子写会生成
      // .xxx.rs.<pid>.<uuid>.tmpdir/ 临时目录，Vite 的 FSWatcher 碰它会 EBUSY 崩掉整个 dev 进程。
      ignored: ['**/target/**', '**/*.exe', '**/src-tauri/**']
    }
  },
  clearScreen: false,
  build: { target: 'es2022' },
});
