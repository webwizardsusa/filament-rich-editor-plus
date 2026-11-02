import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        environmentOptions: { jsdom: { pretendToBeVisual: true } },
        include: ['tests/js/**/*.test.js'],
        setupFiles: ['tests/js/support/setup.js'],
    },
})
