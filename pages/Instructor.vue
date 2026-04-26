<template>
  <div class="instructor-view">
    <div class="main-container">
      <div class="content-wrapper">
        <div class="header-section">
          <div class="header-content">
            <div class="header-text">
              <h1 class="page-title">Instructor Dashboard</h1>
              <p class="page-subtitle">Review and verify pending requests from your classes</p>
            </div>
            <Button 
              label="Refresh" 
              icon="pi pi-refresh" 
              @click="handleRefresh"
              :loading="refreshing"
              class="action-btn refresh-btn"
              severity="secondary"
            />
          </div>
        </div>

        <div class="dashboard-layout">
          <!-- Sidebar: users with pending requests -->
          <aside class="sidebar">
            <div class="card sidebar-card">
              <div class="sidebar-header">
                <h3 class="sidebar-title">
                  <i class="pi pi-users" style="margin-right: 0.5rem;"></i>
                  Students with pending requests
                </h3>
                <Button
                  v-if="sortedPendingUsers.length > 0"
                  icon="pi pi-sort-alt"
                  :class="['sort-button', { 'reversed': isReversed }]"
                  @click="toggleOrder"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  :aria-label="isReversed ? 'Sort ascending' : 'Sort descending'"
                />
              </div>
              <div class="user-list">
                <template v-if="sortedPendingUsers && sortedPendingUsers.length > 0">
                  <button
                    v-for="u in sortedPendingUsers"
                    :key="u.id"
                    type="button"
                    class="user-row"
                    :class="{ active: selectedUser?.id === u.id }"
                    @click="selectUser(u)"
                  >
                    <div class="user-info">
                      <span class="user-email">{{ u.email }}</span>
                      <span class="user-date">{{formatDate(u.oldestPendingAt)}}</span>
                    </div>
                    <Badge :value="u.totalPending" severity="warning" class="pending-badge" />
                  </button>
                </template>
                <p v-else-if="!loading" class="empty-list">
                  <i class="pi pi-inbox" style="margin-right: 0.5rem;"></i>
                  No pending requests in your classes
                </p>
                <div v-else class="loading-state">
                  <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem;"></i>
                  <p>Loading users...</p>
                </div>
              </div>
            </div>
          </aside>

          <!-- Main: selected user's cart -->
          <main class="main-content">
            <div class="card main-card">
              <template v-if="selectedUser && selectedUser.requests">
                <div class="cart-header">
                  <div class="cart-title-section">
                    <h2>
                      <i class="pi pi-shopping-cart" style="margin-right: 0.5rem;"></i>
                      Cart — {{ selectedUser.email }}
                    </h2>
                    <Badge 
                      :value="selectedUser.requests.length + ' items'" 
                      severity="info"
                      class="item-count-badge"
                    />
                  </div>
                  <div class="action-buttons-container">
                    <Button
                      v-if="hasDraftChanges"
                      label="Cancel"
                      icon="pi pi-times"
                      severity="secondary"
                      class="cancel-button"
                      @click="cancelChanges"
                    />
                    <Button
                      label="Verify Cart"
                      icon="pi pi-check"
                      severity="success"
                      :loading="submitting"
                      :disabled="!hasDraftChanges"
                      class="confirm-button"
                      @click="confirmCart"  
                    />
                  </div>
                </div>
                <DataTable
                  :value="selectedUser.requests"
                  :loading="false"
                  dataKey="id"
                  class="p-datatable-sm custom-table"
                  responsiveLayout="scroll"
                >
                  <Column header="Image" style="width: 80px">
                    <template #body="{ data }">
                      <div class="image-container">
                        <img
                          v-if="data.component?.link"
                          :src="data.component.link"
                          :alt="data.component.model"
                          class="component-thumb"
                          loading="lazy"
                          @error="($event.target as HTMLImageElement).style.display = 'none'"
                        />
                        <div v-else class="no-image">
                          <i class="pi pi-image"></i>
                        </div>
                      </div>
                    </template>
                  </Column>
                  <Column field="component.model" header="Component">
                    <template #body="{ data }">
                      <div class="component-info">
                        <span class="component-model">{{ data.component?.model || '—' }}</span>
                        <span v-if="data.component?.manufacturer" class="component-manufacturer">
                          {{ data.component.manufacturer }}
                        </span>
                      </div>
                    </template>
                  </Column>
                  <Column field="component.date" header="Created at">
                    <template #body="{ data }">
                      <div class="component-info">
                        <span class="component-date">{{ formatDate(data.createdAt) || '—' }}</span>
                      </div>
                    </template>
                  </Column>
                  <Column header="Requested" style="width: 100px">
                    <template #body="{ data }">
                      <div class="quantity-badge requested">
                        {{ data.quantityRequested }}
                      </div>
                    </template>
                  </Column>
                  <Column header="In stock" style="width: 100px">
                    <template #body="{ data }">
                      <div 
                        class="quantity-badge stock"
                        :class="{ 'low-stock': data.component?.quantityInStock < data.quantityRequested }"
                      >
                        {{ data.component?.quantityInStock ?? '—' }}
                      </div>
                    </template>
                  </Column>
                  <Column header="Location" style="width: 100px">
                    <template #body="{ data }">
                      <Badge 
                        :value="data.component?.location ?? '—'" 
                        severity="secondary"
                        class="location-badge"
                      />
                    </template>
                  </Column>
                  <Column header="Class" style="width: 100px">
                    <template #body="{ data }">
                      <Tag 
                        :value="data.class" 
                        severity="info"
                        class="class-tag"
                      />
                    </template>
                  </Column>
                  <Column header="Status" style="width: 100px">
                    <template #body="{ data }">
                      <Tag
                        :value="data.status"
                        :severity="data.status === 'declined' ? 'danger' : data.status === 'verified' ? 'success' : 'info'"
                        class="status-tag"
                      />
                    </template>
                  </Column>
                  <Column header="Action" style="min-width: 280px">
                    <template #body="{ data }">
                      <div v-if="data.status === 'declined'" class="declined-label">
                        <Tag value="Declined" severity="danger" icon="pi pi-ban" />
                      </div>
                      <div v-else class="action-cell">
                        <div class="action-controls">
                          <div class="qty-input-wrapper">
                            <label class="qty-label">Qty:</label>
                            <InputNumber
                              :model-value="draftQty(data.id)"
                              :min="0"
                              :max="Math.min(data.quantityRequested, data.component?.quantityInStock ?? 0)"
                              show-buttons
                              class="qty-input"
                              :class="{ 
                                'has-value': draftQty(data.id) > 0,
                                'disabled': getDecision(data.id) === 'decline'
                              }"
                              :disabled="getDecision(data.id) === 'decline'"
                              button-layout="horizontal"
                              increment-button-class="qty-btn"
                              decrement-button-class="qty-btn"
                              @update:model-value="(v: number) => setDraftQty(data.id, v ?? 0)"
                            />
                          </div>
                          <div class="action-buttons">
                            <Button
                              label="Verify"
                              icon="pi pi-check"
                              severity="success"
                              size="small"
                              class="action-btn verify-btn"
                              :class="{ 'selected-action': getDecision(data.id) === 'verify' }"
                              :disabled="getDecision(data.id) === 'decline' || (getDecision(data.id) === 'verify' && draftQty(data.id) < data.quantityRequested)"
                              @click="setVerify(data)"
                            />
                            <Button
                              label="Decline"
                              icon="pi pi-times"
                              severity="secondary"
                              size="small"
                              class="action-btn decline-btn"
                              :class="{ 'selected-action': getDecision(data.id) === 'decline' }"
                              :disabled="getDecision(data.id) === 'verify' && draftQty(data.id) > 0"
                              @click="setDecline(data)"
                            />
                          </div>
                        </div>
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </template>
              <div v-else-if="loading" class="empty-state">
                <div class="empty-state-content">
                  <i class="pi pi-spin pi-spinner empty-icon" />
                  <h3>Loading...</h3>
                  <p>Please wait while we load the data</p>
                </div>
              </div>
              <div v-else class="empty-state">
                <div class="empty-state-content">
                  <i class="pi pi-inbox empty-icon" />
                  <h3>No Student Selected</h3>
                  <p>Select a student from the list to view their pending cart</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useTechnicianCartStore } from '~/stores/technicianCart'

definePageMeta({ 
  middleware: 'auth', 
  requiresAuth: true 
})

const toast = useToast()
const router = useRouter()

// Initialize all refs with default values
const pendingUsers = ref<any[]>([])
const selectedUser = ref<any>(null)
const loading = ref(false)
const refreshing = ref(false) // New ref for refresh button loading state
const submitting = ref(false)
const draftQuantities = ref<Record<string, number>>({})
const isReversed = ref(true)

const cartStore = useTechnicianCartStore()

const token = ref('')
const user = ref<any>(null)

onMounted(() => {
  // Get auth data from localStorage
  if (typeof localStorage !== 'undefined') {
    token.value = localStorage.getItem('token') || ''
    try {
      user.value = JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      user.value = {}
    }
    
    // Check authorization - only instructors and admins
    if (!['admin', 'superadmin', 'instructor'].includes(user.value?.role)) {
      toast.add({ 
        severity: 'error', 
        summary: 'Access denied', 
        detail: 'Instructor or admin only', 
        life: 3000 
      })
      router.push('/home')
      return
    }
    
    loadPendingUsers()
  }
})

// New function for refresh button
async function handleRefresh() {
  refreshing.value = true
  try {
    await loadPendingUsers()
    toast.add({ 
      severity: 'success', 
      summary: 'Refreshed', 
      detail: 'Data has been updated', 
      life: 2000 
    })
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Refresh failed', 
      detail: 'Could not refresh data', 
      life: 3000 
    })
  } finally {
    refreshing.value = false
  }
}

async function loadPendingUsers() {
  console.debug('🚀 Starting loadPendingUsers...')
  loading.value = true
  
  try {
    // Debug token presence
    console.debug('🔑 Auth Check:', { 
      hasToken: !!token.value, 
      userRole: user.value?.role 
    })

    const response = await $fetch('/api/instructor/pending-users', {
      method: 'GET',
      headers: token.value ? {
        Authorization: `Bearer ${token.value}`
      } : {}
    })

    console.debug('📥 API Response received:', response)

    const result = response as { 
      success: boolean; 
      data: any[];
      instructorInfo?: {
        assignedClasses: string[];
        classCount: number;
      }
    }

    if (result?.success && Array.isArray(result.data)) {
      console.log(`✅ Successfully loaded ${result.data.length} pending users`)
      pendingUsers.value = result.data
      
      if (result.instructorInfo && user.value?.role === 'instructor') {
        console.debug('🏫 Instructor Classes:', result.instructorInfo.assignedClasses)
        toast.add({ 
          severity: 'info', 
          summary: 'Your Classes', 
          detail: `Showing requests from ${result.instructorInfo.classCount} class(es)`,
          life: 3000 
        })
      }
      
      if (selectedUser.value) {
        const found = result.data.find((u: any) => u.id === selectedUser.value.id)
        console.debug('👤 Selected user sync:', found ? 'Found' : 'Not found in new data')
        selectedUser.value = found || null
      }
    } else {
      console.warn('⚠️ API returned success but data format is unexpected:', result)
      pendingUsers.value = []
    }
  } catch (error: any) {
    console.error('❌ Error loading pending users:', {
      status: error?.status || error?.statusCode,
      message: error?.message,
      data: error?.data
    })
    
    if (error?.status === 401 || error?.statusCode === 401) {
      console.warn('Redirecting to login due to 401 Unauthorized')
      router.push('/login')
      return
    }
    
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error?.data?.message || error?.message || 'Failed to load pending users', 
      life: 5000 
    })
    
    pendingUsers.value = []
  } finally {
    loading.value = false
    console.debug('🏁 loadPendingUsers finished. Loading state:', loading.value)
  }
}

const sortedPendingUsers = computed(() => {
  console.debug('🔄 Recalculating sortedPendingUsers. Count:', pendingUsers.value.length)
  if (!pendingUsers.value.length) return []
  const sorted = [...pendingUsers.value]
  return isReversed.value ? sorted.reverse() : sorted
})

function toggleOrder() {
  isReversed.value = !isReversed.value
}

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString()
}

function selectUser(u: any) {
  selectedUser.value = u
}

watch(selectedUser, (u) => {
  draftQuantities.value = {}
  
  if (u?.requests && Array.isArray(u.requests)) {
    u.requests.forEach((r: any) => {
      const d = cartStore.getDraft(r.id)
      if (d?.decision === 'returned') {
        draftQuantities.value[r.id] = d.verifiedQuantity
      } else {
        const max = Math.min(r.quantityRequested, r.component?.quantityInStock ?? 0)
        draftQuantities.value[r.id] = max
      }
    })
  }
}, { immediate: true })

function draftQty(requestId: string) {
  return draftQuantities.value[requestId] ?? 0
}

function setDraftQty(requestId: string, value: number) {
  draftQuantities.value[requestId] = value
  cartStore.setDraft(requestId, {
    requestId,
    decision: 'verify',
    verifiedQuantity: value,
  })
}

function setVerify(data: any) {
  const qty = Math.min(
    data.quantityRequested,
    data.component?.quantityInStock ?? 0,
  )
  draftQuantities.value[data.id] = qty
  cartStore.setDraft(data.id, {
    requestId: data.id,
    decision: 'verify',
    verifiedQuantity: qty,
  })
}

function setDecline(data: any) {
  draftQuantities.value[data.id] = 0
  cartStore.setDraft(data.id, {
    requestId: data.id,
    decision: 'decline',
    verifiedQuantity: 0,
  })
}

const hasDraftChanges = computed(() => {
  if (!selectedUser.value?.requests?.length) return false
  
  return selectedUser.value.requests.some((r: any) => {
    const d = cartStore.getDraft(r.id)
    return d && (d.decision === 'decline' || (d.decision === 'verify' && d.verifiedQuantity > 0))
  })
})

async function confirmCart() {
  if (!selectedUser.value?.requests?.length) return
  
  const items: { requestId: string; verifiedQuantity: number; decision: 'verify' | 'decline' }[] = []
  
  for (const r of selectedUser.value.requests) {
    const d = cartStore.getDraft(r.id)
    if (d?.decision === 'decline') {
      items.push({ requestId: r.id, verifiedQuantity: 0, decision: 'decline' })
    } else if (d?.decision === 'verify' && d.verifiedQuantity > 0) {
      items.push({ requestId: r.id, verifiedQuantity: d.verifiedQuantity, decision: 'verify' })
    }
  }
  
  if (items.length === 0) {
    toast.add({ 
      severity: 'warn', 
      summary: 'No actions', 
      detail: 'Set Verify or Decline for at least one item', 
      life: 3000 
    })
    return
  }
  
  submitting.value = true
  
  try {
    // Use instructor-specific process endpoint
    await $fetch('/api/instructor/process-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
      },
      body: { items },
    })
    
    toast.add({ 
      severity: 'success', 
      summary: 'Cart processed', 
      detail: `${items.length} item(s) verified/declined`, 
      life: 3000 
    })
    
    cartStore.clearDraftsForUser(selectedUser.value.requests.map((r: any) => r.id))
    await loadPendingUsers()
    selectedUser.value = pendingUsers.value.find((u: any) => u.id === selectedUser.value?.id) || null
  } catch (error: any) {
    console.error('Error processing cart:', error)
    
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.message || error?.message || 'Failed to process cart',
      life: 5000,
    })
  } finally {
    submitting.value = false
  }
}

function getDecision(requestId: string) {
  const draft = cartStore.getDraft(requestId)
  return draft?.decision || null
}

function cancelChanges() {
  if (!selectedUser.value?.requests?.length) return
  
  const requestIds = selectedUser.value.requests.map((r: any) => r.id)
  cartStore.clearDraftsForUser(requestIds)
  
  selectedUser.value.requests.forEach((r: any) => {
    const maxQty = Math.min(r.quantityRequested, r.component?.quantityInStock ?? 0)
    draftQuantities.value[r.id] = maxQty
  })
  
  toast.add({ 
    severity: 'info', 
    summary: 'Cancelled', 
    detail: 'All selections have been reset', 
    life: 3000 
  })
}
</script>

<style scoped>  
.instructor-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.main-container {
  background: var(--surface-container);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--surface-0);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  color: var(--text-secondary);
  margin: 0;
  font-size: 1.1rem;
}

.refresh-btn {
  flex-shrink: 0;
}

.dashboard-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

/* Sidebar Styles */
.sidebar {
  width: 320px;
  flex-shrink: 0;
}

.sidebar-card {
  padding: 1.5rem;
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.sidebar-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.sidebar-title i {
  margin-right: 0.5rem;
}

.sort-button {
  transition: transform 0.3s ease;
}

.sort-button.reversed {
  transform: rotate(180deg);
}

.sort-button:hover {
  background: rgba(102, 126, 234, 0.1);
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 200px;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08)) !important;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.2s ease;
}

.user-row.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2);
}

.user-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  filter: brightness(1.02);
  border-color: rgba(102, 126, 234, 0.4);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-email {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.user-row.active .user-email,
.user-row.active .user-date {
  color: white;
}

.user-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.pending-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
}

.empty-list,
.loading-state {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 1rem 0 0 0;
  text-align: center;
  padding: 2rem;
  background: var(--surface-section);
  border-radius: 12px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-state i {
  color: #667eea;
}

/* Main Content Styles */
.main-content {
  flex: 1;
  min-width: 0;
}

.main-card {
  padding: 1.5rem;
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-default);
}

.cart-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.cart-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.cart-header h2 i {
  margin-right: 0.5rem;
}

.item-count-badge {
  font-size: 0.9rem;
  padding: 0.25rem 0.75rem;
}

.action-buttons-container {
  display: flex;
  gap: 0.75rem;
}

.confirm-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  transition: transform 0.2s;
}

.confirm-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Table Styles */
.custom-table :deep(.p-datatable-thead > tr > th) {
  background: var(--surface-section);
  color: var(--text-primary);
  font-weight: 600;
  padding: 1rem;
  border-bottom: 2px solid var(--border-default);
}

.custom-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.2s;
}

.custom-table :deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-overlay);
}

.custom-table :deep(.p-datatable-tbody > tr > td) {
  padding: 1rem;
  border-bottom: 1px solid var(--border-default);
}

/* Image Styles */
.image-container {
  width: 48px;
  height: 48px;
  background: var(--surface-section);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.component-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 1.2rem;
}

/* Component Info */
.component-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.component-model {
  font-weight: 500;
  color: var(--text-primary);
}

.component-manufacturer {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Quantity Badges - Consolidated */
.quantity-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  min-width: 60px;
}

.quantity-badge.requested {
  background: #e3f2fd;
  color: #1976d2;
}

.quantity-badge.stock {
  background: #e8f5e8;
  color: #2e7d32;
}

.quantity-badge.stock.low-stock {
  background: #ffebee;
  color: #c62828;
}

/* Badge & Tag Styles - Consolidated */
.location-badge,
.class-tag,
.status-tag {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

/* Action Cell */
.action-cell {
  padding: 0.5rem 0;
}

.action-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.qty-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-section);
  padding: 0.5rem;
  border-radius: 8px;
  width: fit-content;
}

.qty-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 30px;
}

.qty-input {
  width: 120px !important;
}

.qty-input :deep(.p-inputnumber-input) {
  width: 60px !important;
  text-align: center;
  font-weight: 600;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 0.5rem;
}

.qty-input :deep(.p-inputnumber-input:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.qty-input.has-value :deep(.p-inputnumber-input) {
  background: #e8f5e8;
  border-color: #2e7d32;
  color: #2e7d32;
}

.qty-btn {
  background: var(--surface-0) !important;
  border: 1px solid var(--border-default) !important;
  color: var(--text-primary) !important;
}

.qty-btn:hover {
  background: var(--surface-overlay) !important;
  border-color: #667eea !important;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  min-width: 80px;
  transition: all 0.2s;
}

.action-btn.verify-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
}

.action-btn.verify-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.action-btn.decline-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  border: none !important;
  color: white !important;
}

.action-btn.decline-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.declined-label {
  display: flex;
  justify-content: center;
}

.declined-label :deep(.p-tag) {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.empty-state-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
  color: #667eea;
}

.empty-state h3 {
  font-size: 1.3rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-muted);
  font-size: 1rem;
}

/* Cancel button animation */
.cancel-button {
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background-color: #fee2e2 !important;
  border-color: #ef4444 !important;
  color: #ef4444 !important;
}

.cancel-button {
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ─── Dark Mode Overrides ───────────────────────────────────── */
body.p-dark .user-row {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15)) !important;
  border-color: rgba(55, 65, 81, 0.5);
}

body.p-dark .user-row.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
}

body.p-dark .user-row.active .user-email,
body.p-dark .user-row.active .user-date {
  color: white;
}

body.p-dark .user-row:hover:not(.active) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25)) !important;
  border-color: rgba(102, 126, 234, 0.5);
}

/* Responsive - Consolidated Media Queries */
@media (max-width: 1200px) {
  .action-controls {
    flex-direction: column;
  }
  
  .qty-input-wrapper {
    width: 100%;
  }
  
  .qty-input,
  .qty-input :deep(.p-inputnumber) {
    width: 100% !important;
  }
  
  .qty-input :deep(.p-inputnumber-input) {
    width: 100% !important;
  }
  
  .action-buttons {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .dashboard-layout {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
  }
  
  .instructor-view {
    padding: 1rem;
  }
  
  .main-container {
    padding: 1rem;
  }
}

@media (max-width: 768px) {
  .cart-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .confirm-button {
    width: 100%;
  }
  
  .action-cell {
    min-width: 250px;
  }
  
  .action-controls,
  .qty-input-wrapper,
  .qty-input,
  .qty-input :deep(.p-inputnumber) {
    width: 100%;
  }
  
  .qty-input :deep(.p-inputnumber-input) {
    width: 100% !important;
  }
  
  .action-buttons {
    width: 100%;
    justify-content: space-between;
  }
  
  .action-btn {
    flex: 1;
  }
}
</style>