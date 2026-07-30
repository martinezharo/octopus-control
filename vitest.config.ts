import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            // Only resolvable inside an Astro build; the catalog entry point
            // reads the feed's base URL from it.
            'astro:env/server': path.resolve(__dirname, 'tests/mocks/astro-env-server.ts'),
        },
    },
    test: {
        include: ['tests/**/*.test.ts'],
    },
});
