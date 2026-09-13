import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const testSetup = fileURLToPath(new URL('./tests/setup.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [testSetup],
    include: ['tests/unit/**/*.test.ts', 'tests/ui/**/*.test.tsx'],
    restoreMocks: true,
  },
});
