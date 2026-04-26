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

      <!-- Navigation Links (desktop) -->
      <div class="navbar-menu">
        <ul class="nav-links">
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
              <span>{{'‎ ' + link.name }}</span>
            </NuxtLink>
          </li>
        </ul>
                <ul class="nav-links">
          <li
            v-for="link in instructorLinks"
            :key="link.path"
            class="nav-item"
            v-if="isInstructor"
          >
            <NuxtLink
              :to="link.path"
              class="nav-link"
              active-class="active"
            >
              <i :class="`${link.icon} mr-2`"></i>
              <span>{{'‎ ' + link.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Right side: Cart + Profile + Hamburger -->
      <div class="navbar-right">
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
    <span
      v-if="cartCount > 0"
      class="cart-badge"
      :class="{ 'pulse-animation': hasNewItems }"
    >
      {{ cartCount > 99 ? '99+' : cartCount }}
    </span>
  </div>

  <!-- Mobile-only avatar (visible only on small screens) -->
  <Avatar
    :label="userInitial"
    shape="circle"
    class="mobile-avatar clickable"
    @click="showProfileModal = true"
  />

  <!-- User Profile Section (desktop) -->
  <div class="navbar-profile">
    <span v-if="isAdmin" class="admin-badge">
      <i class="pi pi-shield"></i>
      <span class="admin-badge-text">Admin</span>
    </span>

    <div class="user-info">
      <Avatar
        :label="userInitial"
        shape="circle"
        class="user-avatar clickable"
        @click="showProfileModal = true"
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

  <!-- Hamburger Button (mobile only) -->
  <button
    class="hamburger-btn"
    @click="toggleMobileMenu"
    :aria-expanded="isMobileMenuOpen"
    aria-label="Toggle navigation menu"
  >
    <span class="hamburger-icon" :class="{ 'is-open': isMobileMenuOpen }">
      <span></span>
      <span></span>
      <span></span>
    </span>
  </button>
</div>
    </div>

    <!-- Mobile Drawer -->
    <Transition name="drawer">
      <div v-if="isMobileMenuOpen" class="mobile-drawer">
        <!-- Mobile User Info -->
        <div class="mobile-user-section">
          <div class="mobile-user-info">
            <Avatar
              :label="userInitial"
              shape="circle"
              class="user-avatar"
            />
            <div class="mobile-user-details">
              <span class="user-name">{{ userName }}</span>
              <span class="user-email">{{ userEmail }}</span>
            </div>
            <span v-if="isAdmin" class="admin-badge">
              <i class="pi pi-shield"></i>
              <span>Admin</span>
            </span>
          </div>
        </div>

        <!-- Mobile Nav Links -->
        <ul class="mobile-nav-links" v-if="isAdmin">
          <li
            v-for="link in adminLinks"
            :key="link.path"
            class="mobile-nav-item"
          >
            <NuxtLink
              :to="link.path"
              class="mobile-nav-link"
              active-class="active"
              @click="closeMobileMenu"
            >
              <i :class="link.icon"></i>
              <span>{{ link.name }}</span>
            </NuxtLink>
          </li>
        </ul>
        <ul class="mobile-nav-links" v-if="isInstructor">
          <li
            v-for="link in instructorLinks"
            :key="link.path"
            class="mobile-nav-item"
          >
            <NuxtLink
              :to="link.path"
              class="mobile-nav-link"
              active-class="active"
              @click="closeMobileMenu"
            >
              <i :class="link.icon"></i>
              <span>{{ link.name }}</span>
            </NuxtLink>
          </li>
        </ul>

        <!-- Mobile Logout -->
        <div class="mobile-footer">
          <button class="mobile-logout-btn" @click="logout" :disabled="isLoggingOut">
            <i class="pi pi-sign-out"></i>
            <span>{{ isLoggingOut ? 'Logging out…' : 'Logout' }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="isMobileMenuOpen" class="mobile-backdrop" @click="closeMobileMenu" />
    </Transition>

    <!-- Profile Modal -->
    <Dialog
      v-model:visible="showProfileModal"
      modal
      header="User Profile"
      :style="{ width: '25rem' }"
      :closable="true"
    >
      <div class="profile-modal-content">
        <div class="profile-info">
          <Avatar
            :label="userInitial"
            shape="circle"
            size="large"
            class="profile-avatar"
          />
          <div class="profile-details">
            <span class="profile-name">{{ userName }}</span>
            <span class="profile-email">{{ userEmail }}</span>
            <span class="profile-role">{{ user?.role || 'User' }}</span>
          </div>
        </div>

        <div class="theme-settings">
          <h4>Theme Settings</h4>
          
          <div class="theme-option">
            <ToggleSwitch
              v-model="isDarkMode"
              :disabled="useSystemTheme"
            />
            <label>{{ isDarkMode ? 'Dark Mode' : 'Light Mode' }}</label>
          </div>

          <div class="theme-option system-theme">
            <Checkbox
              v-model="useSystemTheme"
              inputId="useSystemTheme"
              :binary="true"
            />
            <label for="useSystemTheme">Use System Theme</label>
          </div>
        </div>
      </div>
    </Dialog>
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
const isMobileMenuOpen = ref(false)
const showProfileModal = ref(false)
const isDarkMode = ref(false)
const useSystemTheme = ref(false)

// Check if user is admin
const isAdmin = computed(() => {
  return user.value?.role === 'admin' || user.value?.role === 'superadmin'
})

// Admin navigation links
const adminLinks = [
  { path: '/logs', name: 'Logs', icon: 'pi pi-history' },
  { path: '/requests', name: 'Requests', icon: 'pi pi-inbox' },
  { path: '/returns', name: 'Returns', icon: 'pi pi-cart-arrow-down' },
  { path: '/PurchaseList', name: 'Purchase List', icon: 'pi pi-list-check' },
  { path: '/Users', name: 'Users', icon: 'pi pi-user' },
]
const isInstructor = computed(() => {
  return user.value?.role === 'instructor'
})
const instructorLinks = [
  { path: '/Instructor', name: 'Requests', icon: 'pi pi-inbox' },
   { path: '/Students', name: 'Students', icon: 'pi pi-user' },
]

// Mobile menu toggle
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Close menu on route change
watch(() => route?.path, () => {
  closeMobileMenu()
})

// Prevent body scroll when mobile menu is open
watch(isMobileMenuOpen, (val) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = val ? 'hidden' : ''
  }
})

// Event handler for cart updates
const handleCartUpdate = (event) => {
  if (route?.path === '/cart') return

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
  setTimeout(() => { hasNewItems.value = false }, 1000)
}

const clearCartNotification = () => {
  cartCount.value = 0
  localStorage.setItem('cartCount', '0')
}

const loadCartData = () => {
  try {
    const savedCount = localStorage.getItem('cartCount')
    if (savedCount) cartCount.value = parseInt(savedCount)

    const savedItems = localStorage.getItem('cartItems')
    if (savedItems) cartItems.value = JSON.parse(savedItems)
  } catch (error) {
    console.error('Error loading cart data:', error)
    cartCount.value = 0
    cartItems.value = []
  }
}

const goToCart = () => {
  clearCartNotification()
  closeMobileMenu()
  if (router) router.push('/cart')
}

watch(() => route?.path, (newPath) => {
  if (route && newPath === '/cart') clearCartNotification()
}, { immediate: false })

onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    try { user.value = JSON.parse(userData) }
    catch (e) { console.error('Error parsing user data:', e) }
  }

  loadCartData()
  loadThemePreference()

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleSystemThemeChange)

  nextTick(() => {
    if (route?.path === '/cart') clearCartNotification()
  })

  window.addEventListener('cart-updated', handleCartUpdate)
  window.addEventListener('clear-cart-notification', clearCartNotification)
})

onUnmounted(() => {
  window.removeEventListener('cart-updated', handleCartUpdate)
  window.removeEventListener('clear-cart-notification', clearCartNotification)
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.removeEventListener('change', handleSystemThemeChange)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

const userInitial = computed(() =>
  user.value?.name?.[0]?.toUpperCase() ||
  user.value?.email?.[0]?.toUpperCase() ||
  'U'
)

const userName = computed(() => user.value?.name || 'User')
const userEmail = computed(() => user.value?.email || 'user@example.com')

const logout = async () => {
  isLoggingOut.value = true
  closeMobileMenu()
  try {
    const token = localStorage.getItem('token')

    if (typeof window !== 'undefined' && window.magic?.user?.logout) {
      try { await window.magic.user.logout() }
      catch (e) { console.error('Magic client logout failed:', e) }
    }

    if (token) {
      try {
        await $fetch(`api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          ignoreResponseError: true
        })
      } catch (e) { /* silently fail */ }
    }

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('cartCount')
    localStorage.removeItem('cartItems')
    sessionStorage.clear()
    sessionStorage.setItem('explicit_logout', 'true')

    toast.add({
      severity: 'success',
      summary: 'Logged Out',
      detail: 'You have been successfully logged out',
      life: 3000
    })

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

const applyTheme = (dark) => {
  if (typeof document === 'undefined') return
  if (dark) {
    document.body.classList.add('p-dark')
  } else {
    document.body.classList.remove('p-dark')
  }
}

const loadThemePreference = () => {
  if (typeof localStorage === 'undefined') return
  const saved = localStorage.getItem('themePreference')
  const system = localStorage.getItem('useSystemTheme')
  if (system === 'true') {
    useSystemTheme.value = true
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkMode.value = isDark
  } else if (saved) {
    isDarkMode.value = saved === 'dark'
    useSystemTheme.value = false
  } else {
    isDarkMode.value = false
    useSystemTheme.value = false
  }
  applyTheme(isDarkMode.value)
}

const saveThemePreference = () => {
  if (typeof localStorage === 'undefined') return
  if (useSystemTheme.value) {
    localStorage.setItem('useSystemTheme', 'true')
    localStorage.removeItem('themePreference')
  } else {
    localStorage.setItem('useSystemTheme', 'false')
    localStorage.setItem('themePreference', isDarkMode.value ? 'dark' : 'light')
  }
}

const handleSystemThemeChange = (e) => {
  if (useSystemTheme.value) {
    isDarkMode.value = e.matches
    applyTheme(isDarkMode.value)
  }
}

watch(useSystemTheme, (newVal) => {
  if (newVal) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkMode.value = isDark
    applyTheme(isDarkMode.value)
  } else {
    isDarkMode.value = false
    applyTheme(false)
  }
  saveThemePreference()
})

watch(isDarkMode, () => {
  if (!useSystemTheme.value) {
    applyTheme(isDarkMode.value)
    saveThemePreference()
  }
})
</script>

<style scoped>
/* ── Base navbar ─────────────────────────────────── */
.navbar {
  background: var(--surface-0);
  border-bottom: 0.0625rem solid var(--border-default);
  box-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 0 1.5rem;
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
  max-width: 100%;
  margin: 0 auto;
}

/* ── Brand ───────────────────────────────────────── */
.navbar-brand {
  display: flex;
  align-items: center;
  flex-shrink: 0;
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
  background-color: var(--surface-overlay);
}

.navbar-logo {
  font-size: 1.75rem;
  color: #3b82f6;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading);
  letter-spacing: -0.025em;
}

.brand-subtitle {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 0.25rem;
}

/* ── Desktop nav menu ────────────────────────────── */
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
  color: var(--text-secondary);
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.nav-link:hover {
  background-color: var(--surface-overlay);
  color: var(--text-heading);
}

.nav-link.active {
  background-color: var(--surface-active);
  color: #1d4ed8;
  font-weight: 600;
}

.nav-link.active i {
  color: #3b82f6;
}

/* ── Right group ─────────────────────────────────── */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ── Cart ────────────────────────────────────────── */
.cart-container {
  position: relative;
  display: inline-block;
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

/* ── Profile (desktop) ───────────────────────────── */
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
  background-color: var(--surface-overlay);
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
  flex-shrink: 0;
}

.user-avatar.clickable {
  cursor: pointer;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-heading);
  line-height: 1.25;
}

.user-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
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

/* ── Admin badge ─────────────────────────────────── */
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

/* ── Pulse animation ─────────────────────────────── */
@keyframes pulse {
  0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  50%  { transform: scale(1.2); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.pulse-animation {
  animation: pulse 1s ease-in-out;
}

/* ── Hamburger button ────────────────────────────── */
.hamburger-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  margin-left: 0.25rem;
}

.hamburger-btn:hover {
  background-color: var(--surface-overlay);
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 22px;
  height: 16px;
}

.hamburger-icon span {
  display: block;
  width: 100%;
  height: 2px;
  background-color: #374151;
  border-radius: 2px;
  transition: transform 0.3s ease, opacity 0.3s ease;
  transform-origin: center;
}

/* Animate to X when open */
.hamburger-icon.is-open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.hamburger-icon.is-open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}
.hamburger-icon.is-open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ── Mobile avatar (visible only on small screens) ─ */
.mobile-avatar {
  display: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Mobile drawer ───────────────────────────────── */
.mobile-drawer {
  background: var(--surface-0);
  border-top: 1px solid var(--border-default);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Mobile user section */
.mobile-user-section {
  padding: 0.75rem;
  background: var(--surface-section);
  border-radius: 10px;
  margin-bottom: 0.25rem;
}

.mobile-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mobile-user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.mobile-user-details .user-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-user-details .user-email {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Mobile nav links */
.mobile-nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mobile-nav-item {
  display: flex;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.15s ease;
}

.mobile-nav-link:hover {
  background-color: var(--surface-overlay);
  color: var(--text-heading);
}

.mobile-nav-link.active {
  background-color: var(--surface-active);
  color: #1d4ed8;
  font-weight: 600;
}

.mobile-nav-link.active i {
  color: #3b82f6;
}

.mobile-nav-link i {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

/* Mobile footer / logout */
.mobile-footer {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-default);
}

.mobile-logout-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.mobile-logout-btn:hover:not(:disabled) {
  background-color: #fef2f2;
  color: #dc2626;
}

.mobile-logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mobile-logout-btn i {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
}

/* Backdrop */
.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: -1;
  top: 64px;
}

/* ── Transitions ─────────────────────────────────── */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Responsive breakpoints ──────────────────────── */

/* Tablet: hide user details text, keep avatar */
@media (max-width: 1024px) {
  .brand-subtitle { display: none; }
  .user-details { display: none; }
  .admin-badge-text { display: none; }
  .admin-badge { padding: 0.35rem; }
}

/* Mobile: switch to hamburger layout and show mobile avatar */
@media (max-width: 768px) {
  .navbar { padding: 0 1rem; }

  /* Hide desktop nav and profile */
  .navbar-menu { display: none; }
  .navbar-profile { display: none; }

  /* Show hamburger and mobile avatar */
  .hamburger-btn { display: flex; }
  .mobile-avatar { display: inline-flex; }
}

/* ── Profile Modal ────────────────────────────────── */
.profile-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-section);
  border-radius: 12px;
}

.profile-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 600;
}

.profile-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.profile-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-heading);
}

.profile-email {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.profile-role {
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 500;
  text-transform: capitalize;
}

.theme-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.theme-settings h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.theme-option label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.theme-option.system-theme {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-default);
}

/* ── Fix: ToggleSwitch (light mode) ───────────────── */
:global(body:not(.p-dark)) .p-inputSwitch .p-inputSwitch-slider {
  background: #cbd5e1 !important;
  box-shadow: none !important;
}

:global(body:not(.p-dark)) .p-inputSwitch.p-inputSwitch-checked {
  background: #667eea !important;
}

:global(body:not(.p-dark)) .p-inputSwitch.p-inputSwitch-checked .p-inputSwitch-slider {
  background: #ffffff !important;
}

/* ── Fix: Checkbox checkmark always visible ───────── */
:deep(.p-checkbox .p-checkbox-box.p-checkbox-checked .p-checkbox-icon) {
  opacity: 1 !important;
  visibility: visible !important;
  color: white !important;
  display: inline-flex !important;
}

:deep(.p-checkbox .p-checkbox-box.p-checkbox-checked) {
  background-color: #667eea !important;
  border-color: #667eea !important;
}

/* Dark mode overrides for checkbox */
:global(body.p-dark) :deep(.p-checkbox .p-checkbox-box.p-checkbox-checked) {
  background-color: #60a5fa !important;
  border-color: #60a5fa !important;
}

:global(body.p-dark) :deep(.p-checkbox .p-checkbox-box.p-checkbox-checked .p-checkbox-icon) {
  color: white !important;
}

/* ── Dark Mode overrides for Navbar-specific styles ─ */
:global(body.p-dark) .mobile-user-details .user-name {
  color: var(--text-heading);
}

:global(body.p-dark) .mobile-user-details .user-email {
  color: var(--text-secondary);
}

:global(body.p-dark) .mobile-nav-link {
  color: var(--text-primary);
}

:global(body.p-dark) .mobile-nav-link:hover {
  background-color: var(--surface-overlay);
  color: var(--text-heading);
}

:global(body.p-dark) .mobile-nav-link.active {
  background-color: var(--surface-active);
}

:global(body.p-dark) .mobile-nav-link.active i {
  color: #60a5fa;
}

:global(body.p-dark) .mobile-footer {
  border-top-color: var(--border-default);
}

:global(body.p-dark) .mobile-logout-btn {
  color: var(--text-secondary);
}

:global(body.p-dark) .mobile-logout-btn:hover:not(:disabled) {
  background-color: #450a0a;
  color: #f87171;
}

:global(body.p-dark) .profile-info {
  background: var(--surface-section);
}

:global(body.p-dark) .profile-name {
  color: var(--text-heading);
}

:global(body.p-dark) .profile-email {
  color: var(--text-secondary);
}

:global(body.p-dark) .profile-role {
  color: #3b82f6;
}

:global(body.p-dark) .theme-settings h4 {
  color: var(--text-primary);
}

:global(body.p-dark) .theme-option label {
  color: var(--text-primary);
}

:global(body.p-dark) .theme-option.system-theme {
  border-top-color: var(--border-default);
}

:global(body.p-dark) .cart-badge {
  background-color: #dc2626;
  border-color: #1f2937;
}

/* Mobile avatar dark mode */
:global(body.p-dark) .mobile-avatar {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
}
</style>