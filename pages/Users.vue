<template>
  <div class="users-view">
    <div class="main-container">
      <div class="content-wrapper">
        <div class="header-section">
          <div>
            <h1 class="text-3xl font-bold text-surface-900">
              Users Management
            </h1>
            <br />
            <p class="text-surface-600 mt-2">
              View and manage user roles with filtering
            </p>
          </div>
        </div>

        <div class="card mb-6">
          <div class="flex justify-between items-left p-4 gap-3 flex-wrap">
            <div class="flex items-center gap-4 w-full md:w-auto">
              <span class="p-input-icon-left w-full md:w-96">
                <i class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Search by email..."
                  class="w-full"
                  @input="handleSearch"
                />
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Select
                v-model="roleFilter"
                :options="roleOptions"
                option-label="label"
                option-value="value"
                placeholder="All roles"
                class="w-44"
                @change="loadData"
              />
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                @click="loadData"
                :loading="loading"
              />
            </div>
          </div>
        </div>

        <div class="main-content-area">
          <div class="table-section">
            <div class="card">
              <DataTable
                :value="filteredUsers"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                :loading="loading"
                v-model:selection="selectedUser"
                selectionMode="single"
                dataKey="id"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
                responsiveLayout="scroll"
                class="p-datatable-sm"
                sortField="createdAt"
                :sortOrder="-1"
              >
                <Column field="email" header="Email" :sortable="true">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-user text-surface-400" />
                      <span>{{ data.email }}</span>
                      <Badge
                        v-if="data.email === currentUserEmail"
                        value="You"
                        severity="info"
                        size="small"
                      />
                    </div>
                  </template>
                </Column>

                <Column field="role" header="Role" :sortable="true">
                  <template #body="{ data }">
                    <Tag :value="data.role" :severity="roleSeverity(data.role)" rounded />
                  </template>
                </Column>

                <Column field="createdAt" header="Created" :sortable="true">
                  <template #body="{ data }">
                    {{ formatDate(data.createdAt) }}
                  </template>
                </Column>
              </DataTable>
            </div>

            <div v-if="selectedUser" class="mt-4 p-4 bg-primary-50 rounded-lg">
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-medium text-primary-900">
                    Selected user
                  </span>
                  <p class="text-sm text-primary-700 mt-1">
                    {{ selectedUser.email }} — {{ selectedUser.role }}
                  </p>
                </div>
                <Button
                  label="Change role"
                  icon="pi pi-pencil"
                  size="small"
                  @click="openEditDialog"
                />
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="card sticky-sidebar">
              <div class="p-4 border-b">
                <div class="text-lg font-semibold text-surface-900">
                  <strong>Role summary</strong>
                </div>
              </div>
              <div class="p-4 space-y-2 text-sm text-surface-700">
                <div v-for="opt in roleOptions" :key="opt.label" class="flex justify-between">
                  <span>{{ opt.label }}</span>
                  <span class="font-semibold">{{ countByRole(opt.value) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="showEditDialog"
      :style="{ width: '400px' }"
      header="Update User Role"
      :modal="true"
    >
      <div class="p-fluid">
        <div class="field">
          <label>Email</label>
          <InputText :value="editForm.email" disabled class="mt-2" />
        </div>
        <br />
        <div class="field">
          <label>Role</label>
          <Select
            v-model="editForm.role"
            :options="roleOptions.filter(r => r.value)"
            option-label="label"
            option-value="value"
            class="mt-2 w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          @click="showEditDialog = false"
          class="p-button-text"
          severity="danger"
        />
        <Button
          label="Update"
          icon="pi pi-check"
          @click="updateUserRole"
          :loading="updatingUser"
          autofocus
        />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

definePageMeta({ middleware: 'auth', requiresAuth: true })

const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()
const apiBase = computed(() => (config.public?.API_URL as string) || '')
const apiUrl = (path: string) =>
  apiBase.value ? `${String(apiBase.value).replace(/\/$/, '')}/${path}` : `/api/${path}`

const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'))
const users = ref<any[]>([])
const loading = ref(false)
const selectedUser = ref<any | null>(null)
const searchQuery = ref('')
const roleFilter = ref<string | null>(null)

const showEditDialog = ref(false)
const updatingUser = ref(false)
const editForm = ref<{ id: string | null; email: string; role: string | null }>({
  id: null,
  email: '',
  role: null,
})

const roleOptions = [
  { label: 'All roles', value: null },
  { label: 'Super admin', value: 'superadmin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Instructor', value: 'instructor' },
  { label: 'Student', value: 'student' },
]

onMounted(() => {
  checkAccess()
  loadData()
})

function checkAccess() {
  const r = user.value?.role
  if (r !== 'admin' && r !== 'superadmin') {
    toast.add({
      severity: 'error',
      summary: 'Access denied',
      detail: 'Only administrators can access this page',
      life: 3000,
    })
    router.push('/home')
  }
}

const currentUserEmail = computed(() => user.value?.email || '')

const filteredUsers = computed(() => {
  let list = [...users.value]
  if (roleFilter.value) {
    list = list.filter((u) => u.role === roleFilter.value)
  }
  if (!searchQuery.value.trim()) return list
  const term = searchQuery.value.toLowerCase().trim()
  return list.filter((u) => u.email.toLowerCase().includes(term))
})

function handleSearch() {
  // simple reactive filter, nothing needed here
}

function countByRole(role: string | null) {
  if (!role) return users.value.length
  return users.value.filter((u) => u.role === role).length
}

function roleSeverity(role: string) {
  if (role === 'superadmin') return 'danger'
  if (role === 'admin') return 'warning'
  if (role === 'instructor') return 'info'
  return 'success'
}

async function loadData() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const query: Record<string, string> = {}
    if (roleFilter.value) query.role = roleFilter.value
    const res = await $fetch<{ success: boolean; data: any[] }>(apiUrl('admin/users'), {
      query,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res?.success && Array.isArray(res.data)) {
      users.value = res.data
    } else {
      throw new Error('Invalid response')
    }
  } catch (error: any) {
    if (error?.statusCode === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.message || error?.message || 'Failed to load users',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

function openEditDialog() {
  if (!selectedUser.value) return
  editForm.value = {
    id: selectedUser.value.id,
    email: selectedUser.value.email,
    role: selectedUser.value.role,
  }
  showEditDialog.value = true
}

function formatDate(d: string | Date | null) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function updateUserRole() {
  if (!editForm.value.id || !editForm.value.role) {
    toast.add({
      severity: 'warn',
      summary: 'Missing role',
      detail: 'Please select a role',
      life: 3000,
    })
    return
  }
  updatingUser.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await $fetch<{ success: boolean; data: any }>(apiUrl(`admin/users/${editForm.value.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as Record<string, string>,
      body: { role: editForm.value.role },
    })
    if (res?.success && res.data) {
      const idx = users.value.findIndex((u) => u.id === res.data.id)
      if (idx !== -1) users.value[idx] = res.data
      toast.add({
        severity: 'success',
        summary: 'Role updated',
        detail: `User role updated to ${res.data.role}`,
        life: 3000,
      })
      showEditDialog.value = false
      selectedUser.value = res.data
    } else {
      throw new Error('Failed to update user')
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: error?.data?.message || error?.message || 'Failed to update user',
      life: 5000,
    })
  } finally {
    updatingUser.value = false
  }
}
</script>

<style scoped>
.users-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
.main-container {
  padding: 1.5rem;
}
.content-wrapper {
  max-width: 1800px;
  margin: 0 auto;
}
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.main-content-area {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.table-section {
  flex: 1;
  min-width: 0;
}
.sidebar-section {
  width: 260px;
  flex-shrink: 0;
}
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}
.sticky-sidebar {
  position: sticky;
  top: 6rem;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
}
@media (max-width: 1200px) {
  .main-content-area {
    flex-direction: column;
  }
  .sidebar-section {
    width: 100%;
    margin-top: 1.5rem;
  }
  .sticky-sidebar {
    position: static;
    max-height: none;
  }
}
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .main-container {
    padding: 1rem;
  }
}
</style>

