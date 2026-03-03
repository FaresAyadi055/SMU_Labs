<template>
  <footer class="simple-footer surface-section p-3 border-top-1 surface-border">
    <div class="footer-container">

      <div class="footer-section">
        <div class="flex align-items-center gap-2">
          <Avatar icon="pi pi-box" shape="circle" size="small" />
          <span class="font-medium"> FabLab Inventory</span>
        </div>
        <div class="text-xs opacity-80 mt-1">
          © {{ currentYear }} All rights reserved.
        </div>
      </div>

      <div class="footer-section">
        <span class="font-bold block mb-2">Contact Us:</span>
        <a href="mailto:fablab@smu.tn" class="contact-link">
          <i class="pi pi-envelope"></i>
          <span>makerspace@smu.tn</span>
        </a>
      </div>

      <div class="footer-section">
        <span class="font-bold block mb-2">Made by:</span>
        <a href="mailto:fares.ayadi@medtech.tn" class="contact-link">
          <i class="pi pi-envelope"></i>
          <span>fares.ayadi@medtech.tn</span>
        </a>
      </div>

    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import Avatar from 'primevue/avatar'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.simple-footer {
   background: rgba(25, 25, 35, 0.85);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-container {
  display: flex;
  flex-direction: column; /* Stack on mobile */
  justify-content: space-around; /* Spread out on desktop */
  align-items: center;
  gap: 2rem;
}

/* Tablet and Desktop */
@media (min-width: 768px) {
  .footer-container {
    flex-direction: row;
    align-items: flex-start;
  }
}

.footer-section {
  flex: 1; /* Gives each section equal width */
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: white;
}

.contact-link {
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.contact-link:hover {
  text-decoration: underline;
}

.font-medium {
  font-weight: 600;
  font-size: 1.2rem;
}
.font-bold {
  font-weight: 600;
  font-size: 1.2rem;
}
</style>
