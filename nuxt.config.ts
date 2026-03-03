import Lara from '@primevue/themes/lara';

export default defineNuxtConfig({
  // Modules
  modules: [
    '@pinia/nuxt',
    '@primevue/nuxt-module'
  ],
  
  // PrimeVue configuration - this is all you need!
  primevue: {
    options: {
      ripple: true,
      theme: {
        preset: Lara,
        options: {
          prefix: 'p',
          darkModeSelector: '.p-dark', // Changed from 'false' for better compatibility
          cssLayer: false
        }
      }
    },
    composables: {
      include: ['useToast', 'usePrimeVue']
    },
    directives: {
      include: ['Tooltip']
    },
    components: {
      include: ['Button', 'Avatar', 'Toast', 'InputText', 'InputNumber', 'Textarea', 'Select', 'Dialog', 'Badge', 'ProgressSpinner', 'Tag', 'DataTable', 'Column', 'Image']
    }
  },
  
  // Runtime config
  runtimeConfig: {
    MAGIC_SECRET_KEY: process.env.MAGIC_SECRET_KEY,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',

    public: {
      API_URL: process.env.API_URL || 'http://localhost:4000/api',
      STATUS_CHECK_URL: process.env.STATUS_CHECK_URL || 'http://localhost:4000/',
      MAGIC_ENABLED: process.env.VITE_MAGIC_ENABLED || 'true',
      MAGIC_PUBLISHABLE_KEY: process.env.MAGIC_PUBLISHABLE_KEY || ''
    }
  },
  
  app: {
    head: {
      title: 'FabLab Inventory Manager',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  
  build: {
    transpile: ['primevue', '@magic-sdk/admin'],
  },

  nitro: {
    preset: 'vercel', 
    plugins: ['@/server/index'],
    externals: {
      inline: ['@magic-sdk/admin']
    }
  },
  
  compatibilityDate: '2024-04-03',
  pages: true,
  devtools: { enabled: true },
  ssr: false
});