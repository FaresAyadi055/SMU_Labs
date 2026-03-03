<template>
  <div>
    <Navbar v-if="showNavbar" />
    <slot />
    <Footer  />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '~/components/Navbar.vue'
import Footer from '~/components/Footer.vue'

const route = useRoute()
const router = useRouter()

// Pages that should not show navbar/footer
const noNavbarPages = ['/login', '/']
const showNavbar = computed(() => !noNavbarPages.includes(route.path))

// Client-side authentication check
onMounted(() => {
  // Only run on client
  if (process.client) {
    const token = localStorage.getItem('token')
    const publicPages = ['/login', '/']
    
    // If no token and trying to access a protected page, redirect to login
    if (!token && !publicPages.includes(route.path)) {
      router.push('/login')
    }
    
    // If has token and trying to access login page, redirect to home
    if (token && publicPages.includes(route.path)) {
      router.push('/home')
    }
  }
})
</script>