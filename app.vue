<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px; /* Default */
}

/* For laptop screens, scale the root font-size. 
   12.8px is exactly 80% of 16px. 
   Using rem-based scaling ensures the DOM coordinate system stays intact. */
@media screen and (min-width: 1200px) {
  html {
    font-size: 12.8px;
  }
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
  margin: 0;
  font-size: 1rem; /* This will be 12.8px on laptops */
}
</style>