import Lara from '@primevue/themes/lara';
import '@magic-sdk/admin'
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
    MONGO_URI: process.env.MONGO_URI || '',

    public: {
      API_URL: process.env.VITE_API_URL || 'http://localhost:4000/api',
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
    transpile: ['primevue'],
  },

// nuxt.config.ts
nitro: {
  preset: 'vercel',
  externals: {
    inline: ['@magic-sdk/admin']
  },
  vercel: {
    functions: {
      // Update this path to match your renamed file
      'server/api/auth/magic/verify.post': {
        maxDuration: 10,
        includeFiles: ['node_modules/@magic-sdk/admin/**']
      }
    }
  }
},
  
  compatibilityDate: '2024-04-03',
  pages: true,
  devtools: { enabled: true },
  ssr: false
});