import Lara from '@primevue/themes/lara';
import '@magic-sdk/admin'

export default defineNuxtConfig({
  // Modules
  modules: [
    '@pinia/nuxt',
    '@primevue/nuxt-module'
  ],
  
  // PrimeVue configuration
  primevue: {
    options: {
      ripple: true,
      theme: {
        preset: Lara,
        options: {
          prefix: 'p',
          darkModeSelector: 'system',
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
      include: ['Button', 'Avatar', 'Toast', 'InputText', 'InputNumber', 'Textarea', 'Select', 'Dialog', 'Badge', 'ProgressSpinner', 'Tag', 'DataTable', 'Column', 'Image', 'Checkbox', 'ToggleSwitch']
    }
  },
  
  // Runtime config
  runtimeConfig: {
    MAGIC_SECRET_KEY: process.env.MAGIC_SECRET_KEY,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    MONGO_URI: process.env.MONGO_URI || '',

    public: {
      MAGIC_ENABLED: process.env.VITE_MAGIC_ENABLED || 'true',
      MAGIC_PUBLISHABLE_KEY: process.env.MAGIC_PUBLISHABLE_KEY || ''
    }
  },
  
  // Global CSS - Only import primeicons (icons) and your custom CSS
  css: [
    'primeicons/primeicons.css',  // Icons only - this still exists
    '~/assets/css/main.css'       // Your custom theme
  ],
  
  // App configuration
  app: {
    head: {
      title: 'FabLab Inventory Manager',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      meta: [
        { 
          name: 'viewport',
          content: 'width=device-width, initial-scale=1' 
        }
      ]
    }
  },
  
  // Build configuration
  build: {
    transpile: ['primevue'],
  },

  // Nitro configuration
  nitro: {
    preset: 'vercel',
    publicAssets: [
      {
        baseURL: '/',
        dir: 'public',
        maxAge: 60 * 60 * 24 * 365
      }
    ],
    externals: {
      inline: ['@magic-sdk/admin']
    },
    vercel: {
      functions: {
        'server/api/auth/magic/verify.post': {
          maxDuration: 10,
          includeFiles: ['node_modules/@magic-sdk/admin/**']
        }
      }
    }
  },
  
  // Other options
  compatibilityDate: '2024-04-03',
  pages: true,
  devtools: { enabled: true },
  ssr: false
});