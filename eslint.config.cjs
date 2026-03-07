const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'assets/**',
            'landing/**',
            'src/editor/vendor/**',
            'framedshot-v2.0-store.zip'
        ]
    },
    {
        ...js.configs.recommended,
        files: ['src/**/*.js'],
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                chrome: 'readonly',
                Cropper: 'readonly',
                ClipboardItem: 'readonly'
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            indent: ['error', 4],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            eqeqeq: ['error', 'always'],
            'no-var': 'error',
            'prefer-const': ['warn', { destructuring: 'all' }],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'comma-dangle': ['error', 'never'],
            'object-curly-spacing': ['error', 'always'],
            'no-console': 'off'
        }
    }
];
