// @ts-check
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    output: 'static',
    site: 'https://octopuscontrol.com',
    env: {
        schema: {
            // Source of the mirrored catalog. Both carry production defaults so a
            // plain `pnpm build` works with no .env file at all; override them to
            // build against a Fewya preview deployment.
            FEWYA_BASE_URL: envField.string({
                context: 'server',
                access: 'public',
                default: 'https://fewya.com',
                optional: true,
            }),
            FEWYA_SHOP_SLUG: envField.string({
                context: 'server',
                access: 'public',
                default: 'octopus-control',
                optional: true,
            }),
        },
    },
});
