import type { StorybookConfig } from '@storybook/vue3-vite'

// Storybook reuses front/vite.config.ts (aliases, Vue, Tailwind).
// Stories follow Atomic Design: src/stories/{atoms,molecules,organisms,templates,pages}.
const config: StorybookConfig = {
  framework: '@storybook/vue3-vite',
  stories: ['../src/stories/**/*.mdx', '../src/stories/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    // Vue DevTools (and its inspector) inject their own overlay: useless and noisy inside Storybook.
    const devtoolsPlugins = ['vite-plugin-vue-devtools', 'vite-plugin-vue-inspector']
    viteConfig.plugins = (viteConfig.plugins ?? []).flat().filter((plugin) => {
      const name =
        plugin && typeof plugin === 'object' && 'name' in plugin ? String(plugin.name) : ''
      return !devtoolsPlugins.some((prefix) => name.startsWith(prefix))
    })
    return viteConfig
  },
}

export default config
