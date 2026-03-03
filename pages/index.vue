<template>
  <div>
    <LoginView />
  </div>
</template>

<script setup>
// This page uses the auth layout (no navbar)
definePageMeta({
  layout: 'auth'
})

import LoginView from './Login.vue';
</script>