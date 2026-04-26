<!-- pages/login.vue -->
<template>
  <div class="login-container">
    <div class="login-card">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <i class="pi pi-box text-6xl text-primary-500 mb-4"></i>
        <h1 class="text-3xl font-bold text-surface-900">FabLab Inventory</h1>
        <p class="text-surface-600 mt-2">Sign in with your school email</p>
      </div>

      <!-- Auto-login loading state -->
      <div v-if="checkingAuth" class="auth-check">
        <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
        <p class="text-surface-600 mt-3">Signing you in...</p>
      </div>

      <!-- Single Email Input Form -->
      <div v-else class="space-y-6">
        <div class="field">
          <label for="email" class="block text-sm font-medium text-surface-700 mb-2">
            School Email
          </label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="name@medtech.tn"
            size="large"
            class="w-full"
            :invalid="!!emailError"
            @keyup.enter="loginWithMagic"
            autofocus
          />
          <small class="text-red-500 mt-1 block" v-if="emailError">{{ emailError }}</small>
          <div class="text-sm text-surface-600 mt-2">
            <small class="text-surface-500 mt-2 block">
              Only @medtech.tn or @smu.tn emails are allowed
            </small>
          </div>
        </div>

        <Button
          label="Continue with Email"
          size="large"
          class="w-full"
          :loading="loading"
          @click="loginWithMagic"
        />

        <div class="text-center">
          <p class="text-sm text-surface-600">
            You'll receive a 6-digit code to verify your email
          </p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const config = useRuntimeConfig()
const router = useRouter()

// Magic SDK instance
let magic = null
const email = ref('')
const loading = ref(false)
const emailError = ref('')
const magicInitialized = ref(false)

// Controls whether we show the spinner (checking token) vs the email form
const checkingAuth = ref(true)

// ─── Auto-login: check for a valid JWT on mount ───────────────────────────────
onMounted(async () => {
  // If the user explicitly logged out, skip auto-login and show the form
  const explicitLogout = sessionStorage.getItem('explicit_logout')
  if (explicitLogout) {
    sessionStorage.removeItem('explicit_logout')
    checkingAuth.value = false
    await initMagic()
    return
  }

  // Check for an existing, non-expired JWT
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isExpired = payload.exp * 1000 < Date.now()

      if (!isExpired) {
        // Valid token — redirect immediately, no email form needed
        await navigateTo('/home')
        return
      }
    } catch {
      // Malformed token — clean up and fall through to the form
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  // No valid token — show the email form and initialize Magic
  checkingAuth.value = false
  await initMagic()
})

// ─── Initialize Magic SDK ─────────────────────────────────────────────────────
const initMagic = async () => {
  if (!config.public.MAGIC_PUBLISHABLE_KEY) {
    console.error('Magic Publishable Key is missing')
    return false
  }

  try {
    const { Magic } = await import('magic-sdk')
    magic = new Magic(config.public.MAGIC_PUBLISHABLE_KEY)
    window.magic = magic
    magicInitialized.value = true
    return true
  } catch (error) {
    console.error('Failed to initialize Magic SDK:', error)
    magicInitialized.value = false
    return false
  }
}

// ─── Main login function ──────────────────────────────────────────────────────
const loginWithMagic = async () => {
  if (!validateEmail()) return

  if (!magic || !magicInitialized.value) {
    const initialized = await initMagic()
    if (!initialized) {
      toast.add({
        severity: 'error',
        summary: 'Setup Error',
        detail: 'Authentication service not initialized',
        life: 3000
      })
      return
    }
  }

  loading.value = true
  emailError.value = ''

  try {
    // Step 1: Validate email domain on the server
    const userCheck = await $fetch(`api/auth/login`, {
      method: 'POST',
      body: { email: email.value }
    }).catch(err => {
      throw new Error(err.data?.message || 'Failed to connect to server')
    })

    if (!userCheck.success) {
      throw new Error(userCheck.message || 'Failed to initiate login')
    }

    // Step 2: Trigger Magic OTP — Magic is ONLY used for OTP delivery
    const didToken = await magic.auth.loginWithEmailOTP({
      email: email.value
    })

    // Step 3: Exchange DID token for our own JWT
    const verifyData = await $fetch(`api/auth/magic/verify`, {
      method: 'POST',
      body: { didToken }
    })

    if (verifyData.success && verifyData.data) {
      handleLoginSuccess(verifyData.data)
    } else {
      throw new Error(verifyData.message || 'Verification failed')
    }

  } catch (error) {
    console.error('Login error:', error)

    if (error.message?.includes('Magic RPC Error') || error.code === 'MAGIC_EMAIL_OTP_CANCELLED') {
      toast.add({
        severity: 'info',
        summary: 'Login Cancelled',
        detail: 'You cancelled the login process',
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Login Failed',
        detail: error.data?.message || error.message || 'Failed to login',
        life: 5000
      })
    }
  } finally {
    loading.value = false
  }
}

// ─── Handle successful login ──────────────────────────────────────────────────
const handleLoginSuccess = (data) => {
  const { token, user } = data

  if (!token || !user) {
    toast.add({
      severity: 'error',
      summary: 'Login Error',
      detail: 'Invalid response from server',
      life: 3000
    })
    return
  }

  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))

  toast.add({
    severity: 'success',
    summary: 'Welcome!',
    detail: `Logged in as ${user.email}`,
    life: 2000
  })

  setTimeout(() => {
    navigateTo('/home')
  }, 1500)
}

// ─── Email validation ─────────────────────────────────────────────────────────
const validateEmail = () => {
  emailError.value = ''

  if (!email.value) {
    emailError.value = 'Email is required'
    return false
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(medtech|smu)\.tn$/i
  if (!emailRegex.test(email.value)) {
    emailError.value = 'Please use a valid @medtech.tn or @smu.tn email'
    return false
  }

  return true
}

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
  requiresGuest: true
})
</script>

<style scoped>
.login-container {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: calc(100vh);
  flex: 1;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

.text-center {
  margin-bottom: 2.5rem;
}

.text-center h1 {
  font-size: 2.25rem;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #111827;
  margin-bottom: 0.75rem;
}

.text-center p {
  font-size: 1.125rem;
  line-height: 1.5;
  color: #6b7280;
  margin-top: 0.5rem;
}

.space-y-6 > * + * {
  margin-top: 1.75rem;
}

.field {
  margin-bottom: 1.75rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  display: block;
}

:deep(.p-inputtext) {
  font-size: 1rem;
  line-height: 1.5;
  padding: 0.875rem 1rem;
}

:deep(.p-inputtext-lg) {
  font-size: 1.125rem;
  padding: 1rem 1.25rem;
}

.p-button {
  font-weight: 500;
  letter-spacing: 0.025em;
}

.text-red-500 {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  line-height: 1.4;
  color: #f87171;
}

.text-surface-500 {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  line-height: 1.4;
  color: #6b7280;
}

/* ─── Dark Mode Improvements ───────────────────────────────────── */
body.p-dark .login-card {
  background: rgb(22, 30, 36);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(55, 65, 81, 0.5);
}

body.p-dark .text-center h1 {
  background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

body.p-dark .text-center p,
body.p-dark .text-surface-500 {
  color: var(--text-secondary);
}

body.p-dark .field label {
  color: var(--text-primary);
}

body.p-dark :deep(.p-inputtext) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border-color: var(--border-default);
}

body.p-dark :deep(.p-inputtext:enabled:focus) {
  border-color: #a78bfa;
  box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.2);
}

body.p-dark :deep(.p-inputtext::placeholder) {
  color: var(--text-muted);
}

body.p-dark .text-red-500 {
  color: #fca5a5;
}

body.p-dark :deep(.p-button) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

body.p-dark :deep(.p-button:enabled:hover) {
  background: linear-gradient(135deg, #7c8cf5 0%, #8b5cb8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Dark mode auth check spinner */
body.p-dark .auth-check i {
  color: #a78bfa;
}

body.p-dark .auth-check p {
  color: var(--text-secondary);
}

/* Dark mode animation - subtle glow on card */
body.p-dark .login-card {
  animation: fadeInDark 0.5s ease-out;
}

@keyframes fadeInDark {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .login-card {
    padding: 32px 24px;
    margin: 0 16px;
  }

  .text-center h1 {
    font-size: 1.875rem;
  }

  .text-center p {
    font-size: 1rem;
  }
}
</style>