<!-- app/components/Navbar.vue -->
<template>
  <nav class="navbar">
    <div class="navbar-container">
      <!-- Logo/Brand -->
      <div class="navbar-brand">
        <NuxtLink to="/home" class="logo-link">
          <i class="pi pi-box navbar-logo"></i>
          <span class="brand-name">FabLab</span>
          <span class="brand-subtitle">Inventory</span>
        </NuxtLink>
      </div>

      <!-- Navigation Links -->
      <div class="navbar-menu">
        <ul class="nav-links">
          <!-- Admin Links (only for admins) -->
          <li
            v-for="link in adminLinks"
            :key="link.path"
            class="nav-item"
            v-if="isAdmin"
          >
            <NuxtLink 
              :to="link.path"
              class="nav-link"
              active-class="active"
            >
              <i :class="`${link.icon} mr-2`"></i>
              <span>{{'‎ ' +link.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
      
      <!-- Cart Button with Badge -->
      <div class="cart-container">
        <Button
          icon="pi pi-shopping-cart"
          severity="info"
          text
          rounded
          @click="goToCart"
          class="cart-btn"
          v-tooltip="'View Cart & Requests'"
        />
        <!-- Notification Badge -->
        <span
          v-if="cartCount > 0"
          class="cart-badge"
          :class="{ 'pulse-animation': hasNewItems }"
        >
          {{ cartCount > 99 ? '99+' : cartCount }}
        </span>
      </div>
      
      <!-- User Profile Section -->
      <div class="navbar-profile">
        <!-- Admin Badge (if admin) -->
        <span v-if="isAdmin" class="admin-badge">
          <i class="pi pi-shield"></i>
          <span>Admin</span>
        </span>

        <div class="user-info">
          <Avatar
            :label="userInitial"
            shape="circle"
            class="user-avatar"
          />
          <div class="user-details">
            <span class="user-name">{{ userName }}</span>
            <span class="user-email">{{ userEmail }}</span>
          </div>
        </div>
        <Button
          icon="pi pi-sign-out"
          severity="secondary"
          text
          rounded
          @click="logout"
          class="logout-btn"
          v-tooltip="'Logout'"
          :loading="isLoggingOut"
        />
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const config = useRuntimeConfig()

const isLoggingOut = ref(false)
const cartCount = ref(0)
const hasNewItems = ref(false)
const user = ref({})
const cartItems = ref([])

// Check if user is admin
const isAdmin = computed(() => {
  return user.value?.role === 'admin'
})

// Admin navigation links
const adminLinks = [
  { path: '/logs', name: 'Logs', icon: 'pi pi-history' },
  { path: '/requests', name: 'Requests', icon: 'pi pi-inbox' },
  { path: '/returns', name: 'Returns', icon: 'pi pi-cart-arrow-down' },
  { path: '/PurchaseList', name: 'Purchase List', icon: 'pi pi-list-check' },
  { path: '/Users', name: 'Users', icon: 'pi pi-user' },
]

// Event handler for cart updates
const handleCartUpdate = (event) => {
  if (route?.path === '/cart') {
    return
  }

  cartCount.value += 1
  localStorage.setItem('cartCount', cartCount.value.toString())

  if (event?.detail) {
    const newItem = {
      ...event.detail,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random()
    }

    cartItems.value.push(newItem)
    localStorage.setItem('cartItems', JSON.stringify(cartItems.value))

    const itemName = event.detail.itemName || event.detail.model_name || 'item'
    toast?.add({
      severity: 'info',
      summary: 'Request Added',
      detail: `"${itemName}" added to your requests`,
      life: 2000,
      group: 'tr'
    })
  } else {
    toast?.add({
      severity: 'info',
      summary: 'Request Added',
      detail: 'New request added to your cart',
      life: 2000,
      group: 'tr'
    })
  }

  hasNewItems.value = true
  setTimeout(() => {
    hasNewItems.value = false
  }, 1000)
}

// Clear cart notification
const clearCartNotification = () => {
  cartCount.value = 0
  localStorage.setItem('cartCount', '0')
}

// Load cart data from localStorage
const loadCartData = () => {
  try {
    const savedCount = localStorage.getItem('cartCount')
    if (savedCount) {
      cartCount.value = parseInt(savedCount)
    }

    const savedItems = localStorage.getItem('cartItems')
    if (savedItems) {
      cartItems.value = JSON.parse(savedItems)
    }
  } catch (error) {
    console.error('Error loading cart data:', error)
    cartCount.value = 0
    cartItems.value = []
  }
}

// Go to cart page
const goToCart = () => {
  clearCartNotification()
  if (router) {
    router.push('/cart')
  }
}

// Watch for route changes to clear notification on cart page
watch(() => route?.path, (newPath) => {
  if (route && newPath === '/cart') {
    clearCartNotification()
  }
}, { immediate: false })

// Get user data from localStorage
onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    try {
      user.value = JSON.parse(userData)
    } catch (e) {
      console.error('Error parsing user data:', e)
    }
  }

  loadCartData()

  nextTick(() => {
    if (route?.path === '/cart') {
      clearCartNotification()
    }
  })

  window.addEventListener('cart-updated', handleCartUpdate)
  window.addEventListener('clear-cart-notification', clearCartNotification)
})

onUnmounted(() => {
  window.removeEventListener('cart-updated', handleCartUpdate)
  window.removeEventListener('clear-cart-notification', clearCartNotification)
})

// Computed properties
const userInitial = computed(() => {
  return user.value?.name?.[0]?.toUpperCase() || 
         user.value?.email?.[0]?.toUpperCase() || 
         'U'
})

const userName = computed(() => {
  return user.value?.name || 'User'
})

const userEmail = computed(() => {
  return user.value?.email || 'user@example.com'
})

// Logout function
const logout = async () => {
  isLoggingOut.value = true
  
  try {
    const token = localStorage.getItem('token')
    const apiUrl = config.public.API_URL || 'http://localhost:4000/api'
    
    // Call Magic client logout if available
    if (typeof window !== 'undefined' && window.magic?.user?.logout) {
      try {
        await window.magic.user.logout()
      } catch (e) {
        console.error('Magic client logout failed:', e)
      }
    }

    // Call backend logout (optional)
    if (token) {
      try {
        await $fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          ignoreResponseError: true
        })
      } catch (e) {
        // Silently fail - client-side cleanup is more important
      }
    }
    
    // Clear all auth-related items
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('cartCount')
    localStorage.removeItem('cartItems')
    
    // Clear session storage
    sessionStorage.clear()
    
    toast.add({
      severity: 'success',
      summary: 'Logged Out',
      detail: 'You have been successfully logged out',
      life: 3000
    })
    
    // Redirect to login
    await router.push('/login')
    
  } catch (error) {
    console.error('Logout error:', error)
    toast.add({
      severity: 'error',
      summary: 'Logout Error',
      detail: 'There was an issue logging out',
      life: 3000
    })
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
.navbar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 0 1.5rem;
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  max-width: 100%;
  margin: 0 auto;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.logo-link:hover {
  background-color: #f9fafb;
}

.navbar-logo {
  font-size: 1.75rem;
  color: #3b82f6;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.brand-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  margin-left: 0.25rem;
}

.navbar-menu {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
}

.nav-item {
  display: flex;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.nav-link:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.nav-link.active {
  background-color: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.nav-link.active i {
  color: #3b82f6;
}

.navbar-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.user-info:hover {
  background-color: #f9fafb;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
  cursor: pointer;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.25;
}

.user-email {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.25;
}

.logout-btn {
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background-color: #fef2f2 !important;
  color: #dc2626 !important;
}

.admin-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.admin-badge i {
  font-size: 0.75rem;
}

.cart-container {
  position: relative;
  display: inline-block;
  margin-right: 1rem;
}

.cart-btn {
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.cart-btn:hover {
  background-color: #f0f9ff !important;
  color: #0284c7 !important;
}

.cart-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #ef4444;
  color: white;
  border-radius: 9999px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0 4px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

.pulse-animation {
  animation: pulse 1s ease-in-out;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 1rem;
  }

  .brand-subtitle {
    display: none;
  }

  .nav-link span {
    font-size: 0.875rem;
  }

  .user-name {
    display: none;
  }

  .user-email {
    display: none;
  }

  .admin-badge span {
    display: none;
  }

  .admin-badge i {
    margin: 0;
  }
}
</style>