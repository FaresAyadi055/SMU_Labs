<template>
  <div class="returns-view">
    <div class="main-container">
      <div class="content-wrapper">
        <div class="header-section">
          <h1 class="page-title">Returns</h1>
          <p class="page-subtitle">Mark borrowed items as returned</p>
        </div>
        <div class="card toolbar">
          <span class="p-input-icon-left search-wrap">
            <i class="pi pi-search" />
            <InputText
              v-model="search"
              placeholder="Search by student email or component..."
              class="w-full"
              @keyup.enter="loadActiveLoans"
            />
          </span>
          <Button label="Search" icon="pi pi-search" @click="loadActiveLoans" />
          <Button label="Refresh" icon="pi pi-refresh" :loading="loading" @click="loadActiveLoans" />
        </div>
        <div class="card">
          <DataTable
            :value="filteredLoans"
            :loading="loading"
            dataKey="id"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} loans"
            responsiveLayout="scroll"
            class="p-datatable-sm"
          >
            <Column field="user.email" header="Student">
              <template #body="{ data }">
                {{ data.user?.email ?? '—' }}
              </template>
            </Column>
            <Column header="Component">
              <template #body="{ data }">
                <span>{{ data.component?.model ?? '—' }}</span>
              </template>
            </Column>
            <Column header="Image" style="width: 70px">
              <template #body="{ data }">
                <img
                  v-if="data.component?.link"
                  :src="data.component.link"
                  :alt="data.component.model"
                  class="thumb"
                  loading="lazy"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                <span v-else class="no-img">—</span>
              </template>
            </Column>
            <Column field="quantityBorrowed" header="Qty" />
            <Column field="class" header="Class">
              <template #body="{ data }">
                <Tag :value="data.class" severity="info" />
              </template>
            </Column>
            <Column header="Borrowed at">
              <template #body="{ data }">
                {{ formatDate(data.borrowedAt) }}
              </template>
            </Column>
            <Column header="Action" style="width: 140px">
              <template #body="{ data }">
                <Button
                  label="Mark returned"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  :loading="returningId === data.id"
                  @click="markReturned(data)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

definePageMeta({ middleware: 'auth', requiresAuth: true })

const config = useRuntimeConfig()
const apiBase = computed(() => (config.public?.API_URL as string) || '')
function apiUrl (path: string) {
  return apiBase.value ? `${String(apiBase.value).replace(/\/$/, '')}/${path}` : `/api/${path}`
}

const toast = useToast()
const router = useRouter()
const loans = ref<any[]>([])
const search = ref('')
const loading = ref(false)
const returningId = ref<string | null>(null)

const token = ref('')
onMounted(() => {
  token.value = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : ''
  const user = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
  if (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'instructor') {
    toast.add({ severity: 'error', summary: 'Access denied', detail: 'Technician or admin only', life: 3000 })
    router.push('/home')
    return
  }
  loadActiveLoans()
})

function getHeaders () {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {}
}

async function loadActiveLoans () {
  loading.value = true
  try {
    const params = search.value ? { search: search.value } : {}
    const res = await $fetch<{ success: boolean; data: any[] }>(apiUrl('admin/active-loans'), {
      query: params,
      headers: getHeaders() as Record<string, string>,
    })
    if (res?.success && Array.isArray(res.data)) {
      loans.value = res.data
    }
  } catch (e: any) {
    if (e?.statusCode === 401) {
      router.push('/login')
      return
    }
    toast.add({ severity: 'error', summary: 'Error', detail: e?.data?.message || 'Failed to load active loans', life: 5000 })
  } finally {
    loading.value = false
  }
}

const filteredLoans = computed(() => loans.value)

function formatDate (d: string | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function markReturned (row: any) {
  returningId.value = row.id
  try {
    await $fetch(apiUrl('admin/return-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() } as Record<string, string>,
      body: { requestId: row.id },
    })
    toast.add({ severity: 'success', summary: 'Returned', detail: `${row.component?.model ?? 'Item'} marked as returned`, life: 3000 })
    loans.value = loans.value.filter((l) => l.id !== row.id)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.data?.message || 'Failed to mark as returned', life: 5000 })
  } finally {
    returningId.value = null
  }
}
</script>

<style scoped>
.returns-view { min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); }
.main-container { padding: 1.5rem; }
.content-wrapper { max-width: 1400px; margin: 0 auto; }
.header-section { margin-bottom: 1rem; }
.page-title { font-size: 1.75rem; font-weight: 700; color: #111; margin: 0 0 0.25rem 0; }
.page-subtitle { color: #666; margin: 0; }
.toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.search-wrap { flex: 1; min-width: 200px; }
.thumb { width: 40px; height: 40px; object-fit: contain; border-radius: 4px; }
.no-img { color: #9ca3af; }
.card { padding: 1rem; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
</style>
