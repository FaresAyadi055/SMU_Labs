<template>
  <div class="technician-view">
    <div class="main-container">
      <div class="content-wrapper">
        <div class="header-section">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Review and approve pending requests by user</p>
        </div>

        <div class="dashboard-layout">
          <!-- Sidebar: users with pending requests -->
          <aside class="sidebar">
            <div class="card sidebar-card">
              <h3 class="sidebar-title">Users with pending requests</h3>
              <div class="user-list">
                <button
                  v-for="u in pendingUsers"
                  :key="u.id"
                  type="button"
                  class="user-row"
                  :class="{ active: selectedUser?.id === u.id }"
                  @click="selectUser(u)"
                >
                  <span class="user-email">{{ u.email }}</span>
                  <Badge :value="u.totalPending" severity="warning" />
                </button>
                <p v-if="!loading && pendingUsers.length === 0" class="empty-list">
                  No pending requests
                </p>
              </div>
            </div>
          </aside>

          <!-- Main: selected user's cart -->
          <main class="main-content">
            <div class="card main-card">
              <template v-if="selectedUser">
                <div class="cart-header">
                  <h2>Cart — {{ selectedUser.email }}</h2>
                  <Button
                    label="Confirm Cart"
                    icon="pi pi-check"
                    severity="success"
                    :loading="submitting"
                    :disabled="!hasDraftChanges"
                    @click="confirmCart"
                  />
                </div>
                <DataTable
                  :value="selectedUser.requests"
                  :loading="false"
                  dataKey="id"
                  class="p-datatable-sm"
                  responsiveLayout="scroll"
                >
                  <Column header="Image" style="width: 80px">
                    <template #body="{ data }">
                      <img
                        v-if="data.component?.link"
                        :src="data.component.link"
                        :alt="data.component.model"
                        class="component-thumb"
                        loading="lazy"
                        @error="($event.target as HTMLImageElement).style.display = 'none'"
                      />
                      <span v-else class="no-image">—</span>
                    </template>
                  </Column>
                  <Column field="component.model" header="Component" />
                  <Column header="Requested">
                    <template #body="{ data }">
                      {{ data.quantityRequested }}
                    </template>
                  </Column>
                  <Column header="In stock">
                    <template #body="{ data }">
                      {{ data.component?.quantityInStock ?? '—' }}
                    </template>
                  </Column>
                  <Column header="Location">
                    <template #body="{ data }">
                      <Badge :value="data.component?.location ?? '—'" severity="secondary" />
                    </template>
                  </Column>
                  <Column header="Class">
                    <template #body="{ data }">
                      <Tag :value="data.class" severity="info" />
                    </template>
                  </Column>
                  <Column header="Status">
                    <template #body="{ data }">
                      <Tag
                        :value="data.status"
                        :severity="data.status === 'declined' ? 'danger' : 'info'"
                      />
                    </template>
                  </Column>
                  <Column header="Action" style="min-width: 220px">
                    <template #body="{ data }">
                      <div v-if="data.status === 'declined'" class="declined-label">
                        <Tag value="Declined" severity="danger" />
                      </div>
                      <div v-else class="action-cell">
                        <InputNumber
                          :model-value="draftQty(data.id)"
                          :min="0"
                          :max="Math.min(data.quantityRequested, data.component?.quantityInStock ?? 0)"
                          show-buttons
                          class="qty-input"
                          placeholder="Qty"
                          @update:model-value="(v: number) => setDraftQty(data.id, v ?? 0)"
                        />
                        <Button
                          label="Approve"
                          icon="pi pi-check"
                          severity="success"
                          size="small"
                          :disabled="!(draftQty(data.id) > 0)"
                          @click="setApprove(data)"
                        />
                        <Button
                          label="Decline"
                          icon="pi pi-times"
                          severity="secondary"
                          size="small"
                          @click="setDecline(data)"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </template>
              <div v-else class="empty-state">
                <i class="pi pi-inbox empty-icon" />
                <p>Select a user from the list to view their pending cart</p>
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

definePageMeta({ middleware: 'auth', requiresAuth: true })

const toast = useToast()
const router = useRouter()
const config = useRuntimeConfig()
const apiBase = computed(() => (config.public?.API_URL as string) || '')
function apiUrl (path: string) {
  return apiBase.value ? `${apiBase.value.replace(/\/$/, '')}/${path}` : `/api/${path}`
}

const pendingUsers = ref<any[]>([])
const selectedUser = ref<any>(null)
const loading = ref(false)
const submitting = ref(false)
const cartStore = useTechnicianCartStore()

const token = ref('')
onMounted(() => {
  token.value = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : ''
  const user = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
  if (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'instructor') {
    toast.add({ severity: 'error', summary: 'Access denied', detail: 'Technician or admin only', life: 3000 })
    router.push('/home')
    return
  }
  loadPendingUsers()
})

function getHeaders () {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {}
}

async function loadPendingUsers () {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any[] }>(apiUrl('admin/pending-users'), {
      headers: getHeaders() as Record<string, string>,
    })
    if (res?.success && Array.isArray(res.data)) {
      pendingUsers.value = res.data
      if (selectedUser.value) {
        const found = res.data.find((u: any) => u.id === selectedUser.value.id)
        selectedUser.value = found || null
      }
    }
  } catch (e: any) {
    if (e?.statusCode === 401) {
      router.push('/login')
      return
    }
    toast.add({ severity: 'error', summary: 'Error', detail: e?.data?.message || 'Failed to load pending users', life: 5000 })
  } finally {
    loading.value = false
  }
}

function selectUser (u: any) {
  selectedUser.value = u
}

const draftQuantities = ref<Record<string, number>>({})
watch(selectedUser, (u) => {
  draftQuantities.value = {}
  if (u?.requests) {
    u.requests.forEach((r: any) => {
      const d = cartStore.getDraft(r.id)
      if (d?.decision === 'approve') {
        draftQuantities.value[r.id] = d.approvedQuantity
      } else {
        const max = Math.min(r.quantityRequested, r.component?.quantityInStock ?? 0)
        draftQuantities.value[r.id] = max
      }
    })
  }
}, { immediate: true })

function draftQty (requestId: string) {
  return draftQuantities.value[requestId] ?? 0
}
function setDraftQty (requestId: string, value: number) {
  draftQuantities.value[requestId] = value
  cartStore.setDraft(requestId, {
    requestId,
    decision: 'approve',
    approvedQuantity: value,
  })
}

function setApprove (data: any) {
  const qty = Math.min(
    data.quantityRequested,
    data.component?.quantityInStock ?? 0,
  )
  draftQuantities.value[data.id] = qty
  cartStore.setDraft(data.id, {
    requestId: data.id,
    decision: 'approve',
    approvedQuantity: qty,
  })
}

function setDecline (data: any) {
  draftQuantities.value[data.id] = 0
  cartStore.setDraft(data.id, {
    requestId: data.id,
    decision: 'decline',
    approvedQuantity: 0,
  })
}

const hasDraftChanges = computed(() => {
  if (!selectedUser.value?.requests?.length) return false
  return selectedUser.value.requests.some((r: any) => {
    const d = cartStore.getDraft(r.id)
    return d && (d.decision === 'decline' || (d.decision === 'approve' && d.approvedQuantity > 0))
  })
})

async function confirmCart () {
  if (!selectedUser.value?.requests?.length) return
  const items: { requestId: string; approvedQuantity: number; decision: 'approve' | 'decline' }[] = []
  for (const r of selectedUser.value.requests) {
    const d = cartStore.getDraft(r.id)
    if (d?.decision === 'decline') {
      items.push({ requestId: r.id, approvedQuantity: 0, decision: 'decline' })
    } else if (d?.decision === 'approve' && d.approvedQuantity > 0) {
      items.push({ requestId: r.id, approvedQuantity: d.approvedQuantity, decision: 'approve' })
    }
  }
  if (items.length === 0) {
    toast.add({ severity: 'warn', summary: 'No actions', detail: 'Set Approve or Decline for at least one item', life: 3000 })
    return
  }
  submitting.value = true
  try {
    await $fetch(apiUrl('admin/process-cart'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() } as Record<string, string>,
      body: { items },
    })
    toast.add({ severity: 'success', summary: 'Cart processed', detail: `${items.length} item(s) updated`, life: 3000 })
    cartStore.clearDraftsForUser(selectedUser.value.requests.map((r: any) => r.id))
    await loadPendingUsers()
    selectedUser.value = pendingUsers.value.find((u: any) => u.id === selectedUser.value?.id) || null
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.data?.message || 'Failed to process cart',
      life: 5000,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.technician-view { min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); }
.main-container { padding: 1.5rem; }
.content-wrapper { max-width: 1600px; margin: 0 auto; }
.header-section { margin-bottom: 1.5rem; }
.page-title { font-size: 1.75rem; font-weight: 700; color: #111; margin: 0 0 0.25rem 0; }
.page-subtitle { color: #666; margin: 0; }
.dashboard-layout { display: flex; gap: 1.5rem; align-items: flex-start; }
.sidebar { width: 280px; flex-shrink: 0; }
.sidebar-card { padding: 1rem; }
.sidebar-title { font-size: 1rem; font-weight: 600; margin: 0 0 1rem 0; }
.user-list { display: flex; flex-direction: column; gap: 0.25rem; }
.user-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px;
  background: #fff; cursor: pointer; text-align: left; width: 100%;
}
.user-row:hover { background: #f9fafb; border-color: #d1d5db; }
.user-row.active { background: #eff6ff; border-color: #3b82f6; }
.user-email { font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-list { color: #6b7280; font-size: 0.9rem; margin: 0.5rem 0 0 0; }
.main-content { flex: 1; min-width: 0; }
.main-card { padding: 1.25rem; }
.cart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
.cart-header h2 { margin: 0; font-size: 1.25rem; }
.component-thumb { width: 48px; height: 48px; object-fit: contain; border-radius: 6px; }
.no-image { color: #9ca3af; }
.action-cell { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.qty-input { width: 100px; }
.empty-state { text-align: center; padding: 3rem; color: #6b7280; }
.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.5; }
@media (max-width: 900px) { .dashboard-layout { flex-direction: column; } .sidebar { width: 100%; } }
</style>
