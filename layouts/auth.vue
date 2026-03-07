<template>
  <div class="auth-layout">
    <Toast />
    <main class="auth-main">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Toast from 'primevue/toast'
import Footer from '~/components/Footer.vue'
</script>

<style scoped>
.auth-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>