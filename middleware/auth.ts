export default defineNuxtRouteMiddleware((to, from) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) {
    return navigateTo('/login')
  }

  if (to.meta.requiresGuest && token) {
    return navigateTo('/home')
  }
})
