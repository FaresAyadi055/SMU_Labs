<template>
  <div class="users-view">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">Users Management</h1>
          <p class="page-subtitle">View and manage user roles with filtering</p>
        </div>

        <!-- Search and Actions -->
        <div class="card action-card">
          <div class="action-bar">
            <div class="search-wrapper">
              <IconField class="p-input-icon-left search-input">
                <InputIcon   class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Search by email..."
                  class="w-full"
                  @input="handleSearch"
                />
              </IconField>
            </div>
            
            <div class="filter-group">
              <Select
                v-model="roleFilter"
                :options="roleOptions"
                option-label="label"
                option-value="value"
                placeholder="All roles"
                class="filter-select"
                @change="loadData"
              />
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                @click="loadData"
                :loading="loading"
                class="action-btn refresh-btn"
              />
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content-area">
          <div class="table-section">
            <div class="card table-card">
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
                class="custom-table"
                sortField="createdAt"
                :sortOrder="-1"
              >
                <Column field="email" header="Email" :sortable="true">
                  <template #body="{ data }">
                    <div class="user-info">
                      <i class="pi pi-user user-icon" />
                      <span class="user-email">{{ data.email }}</span>
                      <Badge
                        v-if="data.email === currentUserEmail"
                        value="You"
                        severity="info"
                        class="you-badge"
                      />
                    </div>
                  </template>
                </Column>
                                <Column field="ID" header="ID" :sortable="true">
                  <template #body="{ data }">
                    <div class="user-info">
                      <i class="pi pi-id-card user-icon" />
                      <span class="user-email">{{ data.id }}</span>
                      <Badge
                        v-if="data.email === currentUserEmail"
                        value="You"
                        severity="info"
                        class="you-badge"
                      />
                    </div>
                  </template>
                </Column>

                <Column field="role" header="Role" :sortable="true">
                  <template #body="{ data }">
                    <Tag 
                      :value="data.role" 
                      :severity="roleSeverity(data.role)"
                      class="role-tag"
                      rounded
                    />
                  </template>
                </Column>

                <Column field="createdAt" header="Created" :sortable="true">
                  <template #body="{ data }">
                    <div class="date-info">
                      <i class="pi pi-calendar"></i>
                      <span>{{ formatDate(data.createdAt) }}</span>
                    </div>
                  </template>
                </Column>
                <Column field="request" header="Request History" :sortable="false">
                  <template #body="{ data }"> 
                    <div style="display: flex; justify-content: center; align-items: center;">               
                    <Button
                      icon="pi pi-eye"
                      @click="showRequests(data)"
                      class="view-btn"
                      v-tooltip.top="'View details'"
                    text
                    rounded
                    />
                    </div>  
                  </template>
                </Column>
                <!-- Empty State -->
                <template #empty>
                  <div class="empty-state">
                    <div class="empty-state-content">
                      <i class="pi pi-users empty-icon"></i>
                      <h3>No users found</h3>
                      <p>Try adjusting your filters</p>
                    </div>
                  </div>
                </template>
              </DataTable>
            </div>

            <!-- Selected User Info -->
            <div v-if="selectedUser" class="selected-user-card">
              <div class="selected-user-content">
                <div class="selected-user-icon">
                  <i class="pi pi-user"></i>
                </div>
                <div class="selected-user-details">
                  <span class="selected-user-label">Selected user</span>
                  <span class="selected-user-value">{{ selectedUser.email }}</span>
                  <Tag 
                    :value="selectedUser.role" 
                    :severity="roleSeverity(selectedUser.role)"
                    class="selected-user-role"
                  />
                </div>
                <div class="selected-actions" v-if="userRole === 'superadmin'">
                  <Button
                    label="Change role"
                    icon="pi pi-pencil"
                    size="small"
                    @click="openEditDialog"
                    class="change-role-btn"
                  />
                  <Button
                    label="Assign classes"
                    icon="pi pi-book"
                    size="small"
                    @click="openAssignClassesDialog"
                    :disabled="selectedUser.role !== 'instructor'"
                    v-tooltip.top="selectedUser.role !== 'instructor' ? 'Only available for instructors' : 'Manage assigned classes'"
                    class="change-role-btn assign-classes-btn"
                  />
                </div>
              </div>
            </div>
          </div>
            
          <div class="sidebar-section">
            <div class="card sidebar-card">
              <div class="sidebar-header">
                <i class="pi pi-chart-pie"></i>
                <h3>Role Summary</h3>
              </div>
              <div class="sidebar-content">
                <div v-for="opt in roleOptions.filter(r => r.value)" :key="opt.label" class="stat-row">
                  <div class="stat-label-group">
                    <span class="stat-dot" :class="roleColorClass(opt.value)"></span>
                    <span class="stat-label">{{ opt.label }}</span>
                  </div>
                  <div class="stat-value-group">
                    <span class="stat-number">{{ countByRole(opt.value) }}</span>
                    <span class="stat-percentage">{{ calculatePercentage(opt.value) }}%</span>
                  </div>
                </div>
                
                <Divider />
                
                <div class="total-row">
                  <span class="total-label">Total Users</span>
                  <span class="total-value">{{ users.length }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Role Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      :style="{ width: '400px' }"
      header="Update User Role"
      :modal="true"
      class="custom-dialog"
    >
      <div class="dialog-form">
        <div class="form-field">
          <label>Email</label>
          <InputText :value="editForm.email" disabled class="form-input readonly" />
        </div>

        <div class="form-field">
          <label>Role</label>
          <Select
            v-model="editForm.role"
            :options="roleOptions.filter(r => r.value)"
            option-label="label"
            option-value="value"
            class="form-select"
            placeholder="Select a role"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          @click="showEditDialog = false"
          class="dialog-btn cancel-btn"
          text
        />
        <Button
          label="Update"
          icon="pi pi-check"
          @click="updateUserRole"
          :loading="updatingUser"
          class="dialog-btn confirm-btn primary-gradient"
        />
      </template>
    </Dialog>

  <!-- Assign Classes Dialog -->
  <Dialog
    v-model:visible="showAssignClassesDialog"
    :style="{ width: '500px' }"
    header="Assign Classes to Instructor"
    :modal="true"
    class="custom-dialog"
  >
    <div class="dialog-form">
      <!-- Loading overlay -->
      <div v-if="loadingClasses" class="classes-loading">
        <ProgressSpinner style="width: 32px; height: 32px" strokeWidth="4" />
        <span>Loading classes…</span>
      </div>

      <template v-else>
        <div class="form-field">
          <label>Instructor</label>
          <InputText :value="assignClassesForm.email" disabled class="form-input readonly" />
        </div>

        <!-- Class picker -->
        <div class="form-field">
          <label>Add a class</label>
          <div class="class-picker-row">
            <Select
              v-model="selectedPrefix"
              :options="classPrefixes"
              placeholder="Year / Branch"
              class="class-picker-select"
            />
            <Select
              v-model="selectedNumber"
              :options="classNumbers"
              placeholder="Group"
              class="class-picker-number"
            />
            <Button
              icon="pi pi-plus"
              @click="addClassTag"
              :disabled="!selectedPrefix || !selectedNumber"
              class="add-class-btn primary-gradient"
              v-tooltip.top="'Add class'"
              rounded
            />
          </div>
        </div>

        <!-- Assigned classes bubbles -->
        <div class="form-field">
          <label>Assigned classes <span class="tag-count">({{ assignClassesForm.classes.length }})</span></label>
          <div class="class-tags-area">
            <div v-if="assignClassesForm.classes.length === 0" class="no-classes-placeholder">
              <i class="pi pi-info-circle"></i> No classes assigned yet
            </div>
            <span
              v-for="cls in assignClassesForm.classes"
              :key="cls"
              class="class-tag"
            >
              <i class="pi pi-book tag-icon"></i>
              {{ cls }}
              <button class="tag-remove" @click="removeClassTag(cls)" type="button">
                <i class="pi pi-times"></i>
              </button>
            </span>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        @click="showAssignClassesDialog = false"
        class="dialog-btn cancel-btn"
        text
      />
      <Button
        label="Save classes"
        icon="pi pi-check"
        @click="saveAssignedClasses"
        :loading="savingClasses"
        :disabled="loadingClasses"
        class="dialog-btn confirm-btn primary-gradient"
      />
    </template>
  </Dialog>

    <!-- Request History Dialog -->
    <Dialog
      v-model:visible="showRequestsDialog"
      :style="{ width: '560px', maxWidth: '95vw' }"
      :header="`Request History — ${selectedUserForRequests?.email || ''}`"
      :modal="true"
      class="custom-dialog requests-history-dialog"
    >
      <!-- Loading -->
      <div v-if="loadingRequests" class="rh-loading">
        <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
        <p>Loading requests…</p>
      </div>

      <!-- Empty -->
      <div v-else-if="requestsForUser.length === 0" class="rh-empty">
        <i class="pi pi-inbox rh-empty-icon"></i>
        <p>No requests found for this user.</p>
      </div>

      <!-- Cards List -->
      <div v-else class="rh-cards-list">
        <div
          v-for="request in requestsForUser"
          :key="request.id"
          class="rh-card"
          :class="{ 'rh-card--expanded': expandedRequestId === request.id }"
          @click="toggleRequestExpansion(request.id)"
        >
          <!-- Image + status badge -->
          <div class="rh-image-container">
            <img
              :src="request.link || '/placeholder-image.png'"
              :alt="request.model"
              class="rh-image"
              @error="handleImageError"
            />
            <div class="rh-status-badge" :class="getStatusClass(request.status)">
              <i :class="getStatusIcon(request.status)"></i>
              {{ request.status || 'pending' }}
            </div>
          </div>

          <!-- Info -->
          <div class="rh-info">
            <div class="rh-header">
              <h3 class="rh-title">{{ request.model || 'Unknown Item' }}</h3>
              <i
                class="pi rh-chevron"
                :class="expandedRequestId === request.id ? 'pi-chevron-up' : 'pi-chevron-down'"
              ></i>
            </div>

            <div class="rh-details">
              <div class="rh-detail-item">
                <i class="pi pi-hashtag rh-detail-icon"></i>
                <span class="rh-detail-label">Quantity:</span>
                <span class="rh-detail-value">{{ request.requested_quantity }}</span>
              </div>
              <div class="rh-detail-item">
                <i class="pi pi-users rh-detail-icon"></i>
                <span class="rh-detail-label">Class:</span>
                <span class="rh-detail-value">{{ request.class || '—' }}</span>
              </div>
              <div class="rh-detail-item">
                <i class="pi pi-calendar rh-detail-icon"></i>
                <span class="rh-detail-label">Date:</span>
                <span class="rh-detail-value">{{ formatDate(request.timestamp) }}</span>
              </div>
            </div>

            <!-- Expanded -->
            <div v-if="expandedRequestId === request.id" class="rh-expanded">
              <div v-if="request.description" class="rh-detail-row">
                <span class="rh-detail-label">Description:</span>
                <span class="rh-detail-value">{{ request.description }}</span>
              </div>
              <div class="rh-detail-row">
                <span class="rh-detail-label">Stock qty:</span>
                <span class="rh-detail-value">{{ request.current_quantity }}</span>
              </div>
              <div class="rh-detail-row">
                <span class="rh-detail-label">Request ID:</span>
                <span class="rh-detail-value rh-mono">{{ request.id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="rh-footer">
          <span class="rh-count" v-if="!loadingRequests && requestsForUser.length">
            {{ requestsForUser.length }} request{{ requestsForUser.length !== 1 ? 's' : '' }} total
          </span>
          <Button
            label="Close"
            icon="pi pi-times"
            @click="showRequestsDialog = false"
            class="dialog-btn cancel-btn"
            text
          />
        </div>
      </template>
    </Dialog>

    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

definePageMeta({ 
  middleware: 'auth', 
  requiresAuth: true 
})

const router = useRouter()
const toast = useToast()

// State
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
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

// Assign Classes
const showAssignClassesDialog = ref(false)
const savingClasses = ref(false)
const loadingClasses = ref(false)
const assignClassesForm = ref<{ id: string | null; email: string; classes: string[] }>({
  id: null,
  email: '',
  classes: [],
})
const classPrefixes = ref(['Freshman', 'Sophomore RE','Sophomore CSE','Junior RE', 'Junior CSE','Senior RE', 'Senior CSE', 'Final Year RE', 'Final Year CSE',"Licence","HEC"])
const classNumbers = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const selectedPrefix = ref<string | null>(null)
const selectedNumber = ref<number | null>(null)

const token = ref('')

// Computed properties
const userRole = computed(() => user.value?.role || 'student')

// Request History
const showRequestsDialog = ref(false)
const requestsForUser = ref<any[]>([])
const loadingRequests = ref(false)
const selectedUserForRequests = ref<any | null>(null)
const expandedRequestId = ref<string | null>(null)

const roleOptions = [
  { label: 'All roles', value: null },
  { label: 'Super admin', value: 'superadmin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Instructor', value: 'instructor' },
  { label: 'Student', value: 'student' },
]

onMounted(() => {
  // Get auth data from localStorage
  if (typeof localStorage !== 'undefined') {
    token.value = localStorage.getItem('token') || ''
    try {
      user.value = JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      user.value = {}
    }
    
    checkAccess()
    loadData()
  }
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

function calculatePercentage(role: string) {
  if (!users.value.length) return 0
  const count = countByRole(role)
  return ((count / users.value.length) * 100).toFixed(1)
}

function roleSeverity(role: string) {
  if (role === 'superadmin') return 'danger'
  if (role === 'admin') return 'warning'
  if (role === 'instructor') return 'info'
  return 'success'
}

function roleColorClass(role: string) {
  if (role === 'superadmin') return 'dot-danger'
  if (role === 'admin') return 'dot-warning'
  if (role === 'instructor') return 'dot-info'
  return 'dot-success'
}

// For Nuxt server routes, use relative paths
async function loadData() {
  loading.value = true
  try {
    // Build query parameters
    const queryParams = new URLSearchParams()
    if (roleFilter.value) {
      queryParams.append('role', roleFilter.value)
    }
    
    // Use relative path for Nuxt server API
    // This will hit: /api/admin/users
    const response = await $fetch(`/api/admin/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`, {
      method: 'GET',
      headers: token.value ? {
        Authorization: `Bearer ${token.value}`
      } : {}
    })
    
    // Handle the response
    const result = response as { 
      success: boolean; 
      data: any[] 
    }
    
    if (result?.success && Array.isArray(result.data)) {
      users.value = result.data
    } else {
      users.value = []
    }
  } catch (error: any) {
    console.error('Error loading users:', error)
    
    if (error?.status === 401 || error?.statusCode === 401) {
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
    
    users.value = []
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
    // Use relative path for Nuxt server API with dynamic ID
    // This will hit: /api/admin/users/[id]
    const response = await $fetch(`/api/admin/users/${editForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
      },
      body: { role: editForm.value.role },
    })
    
    const result = response as { 
      success: boolean; 
      data: any 
    }
    
    if (result?.success && result.data) {
      const idx = users.value.findIndex((u) => u.id === result.data.id)
      if (idx !== -1) users.value[idx] = result.data
      
      toast.add({
        severity: 'success',
        summary: 'Role updated',
        detail: `User role updated to ${result.data.role}`,
        life: 3000,
      })
      
      showEditDialog.value = false
      selectedUser.value = result.data
    } else {
      throw new Error('Failed to update user')
    }
  } catch (error: any) {
    console.error('Error updating user:', error)
    
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

//Watch for role filter changes to reload data
watch(roleFilter, () => {
  loadData()
})

async function openAssignClassesDialog() {
  if (!selectedUser.value || selectedUser.value.role !== 'instructor') return
  selectedPrefix.value = null
  selectedNumber.value = null
  assignClassesForm.value = {
    id: selectedUser.value.id,
    email: selectedUser.value.email,
    classes: [],
  }
  showAssignClassesDialog.value = true
  loadingClasses.value = true

  try {
    const response = await $fetch(`/api/admin/users/classes/${selectedUser.value.id}`, {
      method: 'GET',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    }) as { success: boolean; data: { assignedClasses: string[] } }

    if (response?.success) {
      assignClassesForm.value.classes = response.data.assignedClasses ?? []
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.statusMessage || error?.message || 'Failed to load assigned classes',
      life: 5000,
    })
  } finally {
    loadingClasses.value = false
  }
}

function addClassTag() {
  if (!selectedPrefix.value || !selectedNumber.value) return
  const cls = `${selectedPrefix.value} G${selectedNumber.value}`
  if (!assignClassesForm.value.classes.includes(cls)) {
    assignClassesForm.value.classes.push(cls)
  }
  selectedPrefix.value = null
  selectedNumber.value = null
}

function removeClassTag(cls: string) {
  assignClassesForm.value.classes = assignClassesForm.value.classes.filter((c) => c !== cls)
}

async function saveAssignedClasses() {
  if (!assignClassesForm.value.id) return
  savingClasses.value = true
  try {
    const response = await $fetch(`/api/admin/users/classes/${assignClassesForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
      body: { assignedClasses: assignClassesForm.value.classes },
    }) as { success: boolean; data: any }

    if (response?.success && response.data) {
      const idx = users.value.findIndex((u) => u.id === response.data.id)
      if (idx !== -1) users.value[idx] = response.data
      selectedUser.value = response.data
      toast.add({
        severity: 'success',
        summary: 'Classes updated',
        detail: `${response.data.assignedClasses?.length ?? 0} class(es) assigned to ${response.data.email}`,
        life: 3000,
      })
      showAssignClassesDialog.value = false
    } else {
      throw new Error('Failed to save classes')
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: error?.data?.statusMessage || error?.message || 'Failed to assign classes',
      life: 5000,
    })
  } finally {
    savingClasses.value = false
  }
}

// Request History helpers
function getStatusClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved': return 'status-approved'
    case 'pending':  return 'status-pending'
    case 'declined': return 'status-declined'
    case 'returned': return 'status-returned'
    default:         return 'status-pending'
  }
}

function getStatusIcon(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved': return 'pi pi-check-circle'
    case 'pending':  return 'pi pi-clock'
    case 'declined': return 'pi pi-times-circle'
    case 'returned': return 'pi pi-undo'
    default:         return 'pi pi-clock'
  }
}

function handleImageError(event: Event) {
  (event.target as HTMLImageElement).src = '/placeholder-image.png'
}

function toggleRequestExpansion(id: string) {
  expandedRequestId.value = expandedRequestId.value === id ? null : id
}

async function showRequests(userData: any) {
  selectedUserForRequests.value = userData
  requestsForUser.value = []
  expandedRequestId.value = null
  showRequestsDialog.value = true
  loadingRequests.value = true

  try {
    const response = await $fetch(`/api/requests/${encodeURIComponent(userData.email)}`, {
      method: 'GET',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {}
    }) as { success: boolean; data: any[] }

    if (response?.success && Array.isArray(response.data)) {
      requestsForUser.value = response.data.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    } else {
      requestsForUser.value = []
    }
  } catch (error: any) {
    console.error('Error loading user requests:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.statusMessage || error?.message || 'Failed to load request history',
      life: 5000
    })
    requestsForUser.value = []
  } finally {
    loadingRequests.value = false
  }
}
</script>

<style scoped>
.users-view {
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
  max-width: 1800px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--surface-0);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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

/* Action Card */
.action-card {
  margin-bottom: 2rem;
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: var(--surface-0);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-wrapper {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.p-inputtext) {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  transition: all 0.2s;
  background: var(--surface-0);
  color: var(--text-primary);
}

.search-input :deep(.p-inputtext:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.search-input :deep(.pi-search) {
  left: 1rem;
  color: var(--text-muted);
}

.filter-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.filter-select {
  width: 200px;
}

.filter-select :deep(.p-dropdown) {
  width: 100%;
  border-radius: 8px;
  border-color: var(--border-default);
  height: 47px;
  background: var(--surface-0);
}

.action-btn {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
  border: none;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.refresh-btn {
  background: var(--surface-0);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

/* Main Content Area */
.main-content-area {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.table-section {
  flex: 1;
  min-width: 0;
}

/* Table Card */
.table-card {
  padding: 1.5rem;
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: var(--surface-0);
}

/* Custom Table Styles */
.custom-table :deep(.p-datatable-thead > tr > th) {
  background: var(--surface-section);
  color: var(--text-primary);
  font-weight: 600;
  padding: 1rem;
  border-bottom: 2px solid var(--border-default);
}

.custom-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.2s;
  cursor: pointer;
  background: var(--surface-0);
  color: var(--text-primary);
}

.custom-table :deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-overlay);
}

.custom-table :deep(.p-datatable-tbody > tr.p-highlight) {
  background: rgba(102, 126, 234, 0.1);
  color: var(--text-primary);
}

.custom-table :deep(.p-datatable-tbody > tr > td) {
  padding: 1rem;
  border-bottom: 1px solid var(--border-default);
}

/* User Info */
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.user-icon {
  color: #667eea;
  font-size: 1rem;
}

.user-email {
  font-weight: 500;
  color: var(--text-primary);
}

.you-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
}

/* Role Tag */
.role-tag {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  font-weight: 500;
}

/* Date Info */
.date-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.date-info i {
  color: #667eea;
}

.view-btn {
  color: #667eea;
}

/* Selected User Card */
.selected-user-card {
  margin-top: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.selected-user-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.selected-user-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.selected-user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.selected-user-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selected-user-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.selected-user-role {
  width: fit-content;
}

.selected-user-role :deep(.p-tag) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.change-role-btn {
  background: white;
  color: #667eea;
  border: none;
  font-weight: 600;
  transition: all 0.2s;
}

.change-role-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.assign-classes-btn {
  color: #764ba2;
  margin-left: 0.5rem;
}

.selected-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Assign Classes Dialog */
.classes-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.class-picker-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.class-picker-select {
  flex: 2;
}

.class-picker-number {
  flex: 1;
  min-width: 90px;
}

.add-class-btn {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  color: white;
  border: none;
}

.tag-count {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.class-tags-area {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.6rem;
  background: var(--surface-section);
  border: 1px solid var(--border-default);
  border-radius: 10px;
}

.no-classes-placeholder {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  width: 100%;
  justify-content: center;
}

.class-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem 0.3rem 0.55rem;
  background: linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%);
  border: 1px solid rgba(102,126,234,0.3);
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 500;
  color: #4c1d95;
  transition: all 0.15s;
}

.class-tag:hover {
  background: linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%);
}

.tag-icon {
  font-size: 0.72rem;
  color: #667eea;
}

.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 0.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  color: var(--text-muted);
  transition: all 0.15s;
  line-height: 1;
}

.tag-remove:hover {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.tag-remove .pi {
  font-size: 0.6rem;
}

/* Sidebar Section */
.sidebar-section {
  width: 300px;
  flex-shrink: 0;
}

.sidebar-card {
  position: sticky;
  top: 6rem;
  padding: 0;
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: var(--surface-0);
}

.sidebar-header {
  padding: 1.25rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sidebar-header i {
  font-size: 1.25rem;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.sidebar-content {
  padding: 1.25rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.stat-row:hover {
  background: var(--surface-overlay);
}

.stat-label-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.stat-dot.dot-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.stat-dot.dot-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-dot.dot-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.stat-dot.dot-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stat-value-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-number {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 2rem;
  text-align: right;
}

.stat-percentage {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 3rem;
  text-align: right;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-top: 0.5rem;
}

.total-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.total-value {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Divider */
.divider {
  margin: 1rem 0;
  border-color: var(--border-default);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 4rem;
  color: #667eea;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 1rem;
}

/* Dialog Styles */
.custom-dialog :deep(.p-dialog-header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}

.custom-dialog :deep(.p-dialog-title) {
  font-weight: 600;
  font-size: 1.25rem;
}

.custom-dialog :deep(.p-dialog-header-icon) {
  color: white;
}

.custom-dialog :deep(.p-dialog-content) {
  padding: 1.5rem;
  background: var(--surface-0);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
}

.form-input :deep(.p-inputtext) {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  padding: 0.75rem;
  transition: all 0.2s;
  background: var(--surface-0);
  color: var(--text-primary);
}

.form-input.readonly :deep(.p-inputtext) {
  background: var(--surface-section);
  color: var(--text-secondary);
}

.form-select {
  width: 100%;
}

.form-select :deep(.p-dropdown) {
  width: 100%;
  border-radius: 8px;
  border-color: var(--border-default);
  background: var(--surface-0);
}

.dialog-btn {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
}

.dialog-btn.cancel-btn {
  color: var(--text-secondary);
}

.dialog-btn.cancel-btn:hover {
  background: var(--surface-overlay);
}

.dialog-btn.confirm-btn {
  color: white;
  border: none;
}

.dialog-btn.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.primary-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Pagination Styling */
.custom-table :deep(.p-paginator) {
  background: transparent;
  border: none;
  padding: 1rem 0 0 0;
}

.custom-table :deep(.p-paginator .p-paginator-pages .p-paginator-page) {
  border-radius: 8px;
  min-width: 2.5rem;
  height: 2.5rem;
  transition: all 0.2s;
}

.custom-table :deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Loading State */
.custom-table :deep(.p-datatable-loading-overlay) {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
}

.custom-table :deep(.p-datatable-loading-icon) {
  color: #667eea;
  font-size: 2rem;
}

/* Scrollbar Styling */
.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-track {
  background: var(--surface-overlay);
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Request History Dialog */
.requests-history-dialog :deep(.p-dialog-content) {
  padding: 0;
  max-height: 65vh;
  overflow: hidden;
}

.rh-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
  max-height: 65vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--text-muted) var(--surface-overlay);
}

.rh-cards-list::-webkit-scrollbar { width: 6px; }
.rh-cards-list::-webkit-scrollbar-track { background: var(--surface-overlay); border-radius: 4px; }
.rh-cards-list::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 4px; }
.rh-cards-list::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }

.rh-card {
  display: flex;
  background: var(--surface-0);
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.rh-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  border-color: #667eea;
}

.rh-card--expanded {
  border-color: #667eea;
  background: var(--surface-section);
}

.rh-image-container {
  position: relative;
  width: 120px;
  flex-shrink: 0;
  background: var(--surface-section);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rh-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.75rem;
  transition: transform 0.3s ease;
}

.rh-card:hover .rh-image { transform: scale(1.05); }

.rh-status-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: white;
  text-transform: capitalize;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.rh-status-badge.status-approved { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.rh-status-badge.status-pending  { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.rh-status-badge.status-declined { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.rh-status-badge.status-returned { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }

.rh-info {
  flex: 1;
  padding: 1rem 1.1rem;
  min-width: 0;
}

.rh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.rh-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rh-chevron {
  color: var(--text-muted);
  font-size: 0.85rem;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.rh-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rh-detail-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.rh-detail-icon {
  color: #667eea;
  font-size: 0.8rem;
  width: 1rem;
}

.rh-detail-label {
  font-weight: 500;
  min-width: 62px;
  color: var(--text-primary);
}

.rh-detail-value {
  color: var(--text-primary);
  font-weight: 500;
}

.rh-expanded {
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  animation: rh-slide-down 0.25s ease-out;
}

@keyframes rh-slide-down {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.rh-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.82rem;
  background: var(--surface-section);
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
}

.rh-detail-row .rh-detail-label {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.rh-detail-row .rh-detail-value {
  color: var(--text-primary);
  text-align: right;
  word-break: break-all;
}

.rh-mono {
  font-family: monospace;
  font-size: 0.72rem;
  background: var(--surface-0);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.rh-loading,
.rh-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1rem;
  color: var(--text-secondary);
}

.rh-empty-icon {
  font-size: 3rem;
  color: #667eea;
  opacity: 0.4;
}

.rh-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.rh-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .main-content-area {
    flex-direction: column;
  }
  
  .sidebar-section {
    width: 100%;
    margin-top: 1.5rem;
  }
  
  .sidebar-card {
    position: static;
  }
}

@media (max-width: 900px) {
  .users-view {
    padding: 1rem;
  }
  
  .main-container {
    padding: 1rem;
  }
  
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-wrapper {
    min-width: 100%;
  }
  
  .filter-group {
    justify-content: stretch;
  }
  
  .filter-select {
    flex: 1;
  }
  
  .action-btn {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .selected-user-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .change-role-btn {
    width: 100%;
  }
  
  .stat-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .stat-value-group {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .header-section {
    padding: 0.75rem;
  }
  
  .action-card,
  .table-card {
    padding: 1rem;
  }
  
  .filter-group {
    flex-direction: column;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .user-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .empty-state {
    padding: 2rem 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-state h3 {
    font-size: 1.25rem;
  }
}
</style>