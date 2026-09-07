import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/pieces/community/asqav/src/**/*.ts'],
      reporter: ['text', 'json'],
    },
  },
});
