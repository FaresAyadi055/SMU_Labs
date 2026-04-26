<template>
  <div class="instructor-students-view">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">My Students</h1>
          <p class="page-subtitle">View students with pending requests in your classes</p>
        </div>

        <!-- Search and Actions -->
        <div class="card action-card">
          <div class="action-bar">
            <div class="search-wrapper">
              <IconField class="p-input-icon-left search-input">
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Search by email..."
                  class="w-full"
                  @input="handleSearch"
                />
              </IconField>
            </div>

            <!-- Class Filter Dropdown -->
            <div class="filter-group">
              <Dropdown
                v-model="selectedClassFilter"
                :options="classFilterOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="All Classes"
                class="class-filter-dropdown"
                :showClear="true"
                @change="handleClassFilter"
              >
                <template #value="{ value }">
                  <div v-if="value" class="filter-value">
                    <i class="pi pi-book"></i>
                    <span>{{ getClassLabel(value) }}</span>
                  </div>
                  <div v-else class="filter-value">
                    <i class="pi pi-filter"></i>
                    <span>All Classes</span>
                  </div>
                </template>
                <template #option="{ option }">
                <div class="filter-option">
                    <i class="pi pi-book"></i>
                    <span>{{ option.label }}</span>
                    <Badge 
                    :value="option.count || 0" 
                    class="class-student-count"
                    severity="info"
                    />
                </div>
                </template>
              </Dropdown>
            </div>

            <div class="filter-group">
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
                :value="filteredStudents"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                :loading="loading"
                selectionMode="single"
                dataKey="id"
                v-model:selection="selectedStudent"
                @rowSelect="onStudentSelect"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} students"
                responsiveLayout="scroll"
                class="custom-table"
                sortField="oldestPendingAt"
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

                <Column field="class" header="Class" :sortable="true">
                  <template #body="{ data }">
                    <Tag :value="data.class" severity="info" class="class-tag" />
                  </template>
                </Column>

                <Column field="requestCount" header="Requests" :sortable="true">
                  <template #body="{ data }">
                    <Badge :value="data.requestCount" severity="warning" class="request-count-badge" />
                  </template>
                </Column>

                <Column field="oldestPendingAt" header="Last Request" :sortable="true">
                  <template #body="{ data }">
                    <div class="date-info">
                      <i class="pi pi-calendar"></i>
                      <span>{{ formatDate(data.latestRequestAt) }}</span>
                    </div>
                  </template>
                </Column>

                <Column field="requests" header="Request History" :sortable="false">
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
                      <h3>No students found</h3>
                      <p>Try adjusting your search or refresh later</p>
                    </div>
                  </div>
                </template>
              </DataTable>
            </div>

            <!-- Selected Student Info (optional) -->
            <div v-if="selectedStudent" class="selected-user-card">
              <div class="selected-user-content">
                <div class="selected-user-icon">
                  <i class="pi pi-user"></i>
                </div>
                <div class="selected-user-details">
                  <span class="selected-user-label">Selected student</span>
                  <span class="selected-user-value">{{ selectedStudent.email }}</span>
                  <Tag
                    :value="selectedStudent.class"
                    severity="info"
                    class="selected-user-role"
                  />
                  <span class="request-count-text">{{ selectedStudent.requestCount }} pending request(s)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar: Classes Summary -->
          <div class="sidebar-section">
            <div class="card sidebar-card">
              <div class="sidebar-header">
                <i class="pi pi-chart-pie"></i>
                <h3>Your Classes</h3>
              </div>
              <div class="sidebar-content">
                <div v-if="classStats.length === 0" class="no-classes-placeholder">
                  <i class="pi pi-info-circle"></i> No classes assigned
                </div>
                <div 
                  v-for="stat in classStats" 
                  :key="stat.className" 
                  class="stat-row" 
                  :class="{ 'active-filter': selectedClassFilter === stat.className }"
                  @click="selectedClassFilter = selectedClassFilter === stat.className ? null : stat.className"
                >
                  <div class="stat-label-group">
                    <span class="stat-dot dot-info"></span>
                    <span class="stat-label">{{ stat.className }}</span>
                  </div>
                  <div class="stat-value-group">
                    <span class="stat-number">{{ stat.studentCount }}</span>
                    <span class="stat-percentage">student(s)</span>
                  </div>
                </div>

                <Divider />

                <div class="total-row">
                <span class="total-label">Total Students</span>
                <span class="total-value">{{ filteredStudentsExcludingInstructor.length }}</span>
                </div>
                <div v-if="selectedClassFilter" class="filter-indicator">
                  <i class="pi pi-filter"></i>
                  <span>Filtered by: {{ selectedClassFilter }}</span>
                  <Button 
                    icon="pi pi-times" 
                    text 
                    rounded 
                    size="small"
                    @click="selectedClassFilter = null"
                    class="clear-filter-btn"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Request History Dialog (same as admin version) -->
    <Dialog
      v-model:visible="showRequestsDialog"
      :style="{ width: '560px', maxWidth: '95vw' }"
      :header="`Request History — ${selectedStudentForRequests?.email || ''}`"
      :modal="true"
      class="custom-dialog requests-history-dialog"
    >
      <div v-if="loadingRequests" class="rh-loading">
        <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
        <p>Loading requests…</p>
      </div>

      <div v-else-if="requestsForStudent.length === 0" class="rh-empty">
        <i class="pi pi-inbox rh-empty-icon"></i>
        <p>No requests found for this student in your classes.</p>
      </div>

      <div v-else class="rh-cards-list">
        <div
          v-for="request in requestsForStudent"
          :key="request.id"
          class="rh-card"
          :class="{ 'rh-card--expanded': expandedRequestId === request.id }"
          @click="toggleRequestExpansion(request.id)"
        >
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
          <span class="rh-count" v-if="!loadingRequests && requestsForStudent.length">
            {{ requestsForStudent.length }} request{{ requestsForStudent.length !== 1 ? 's' : '' }} total
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
import { ref, computed, onMounted } from 'vue'
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
const students = ref<any[]>([])
const classStats = ref<any[]>([])
const loading = ref(false)
const selectedStudent = ref<any | null>(null)
const searchQuery = ref('')
const token = ref('')
const selectedClassFilter = ref<string | null>(null)

// Request history
const showRequestsDialog = ref(false)
const requestsForStudent = ref<any[]>([])
const loadingRequests = ref(false)
const selectedStudentForRequests = ref<any | null>(null)
const expandedRequestId = ref<string | null>(null)

onMounted(() => {
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
  const role = user.value?.role
  if (!['instructor', 'admin', 'superadmin'].includes(role)) {
    toast.add({
      severity: 'error',
      summary: 'Access denied',
      detail: 'Only instructors and administrators can access this page',
      life: 3000,
    })
    router.push('/home')
  }
}

async function loadData() {
  loading.value = true
  try {
    const response = await $fetch('/api/instructor/students', {
      method: 'GET',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {}
    }) as {
      success: boolean
      data: any[]
      classStats: any[]
      instructorInfo?: any
    }

    if (response?.success) {
      students.value = response.data
      classStats.value = response.classStats || []
    } else {
      students.value = []
      classStats.value = []
    }
  } catch (error: any) {
    console.error('Error loading students:', error)
    if (error?.status === 401 || error?.statusCode === 401) {
      router.push('/login')
      return
    }
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.message || error?.message || 'Failed to load students',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

const currentUserEmail = computed(() => user.value?.email || '')
const currentUserId = computed(() => user.value?.id || user.value?._id || '')

// Students excluding the logged-in instructor
const studentsExcludingInstructor = computed(() => {
  return students.value.filter(s => s.id !== currentUserId.value)
})

// Total students excluding instructor
const totalStudentsExcludingInstructor = computed(() => studentsExcludingInstructor.value.length)

// Filtered list for table (includes instructor for display)
const filteredStudents = computed(() => {
  let result = students.value
  if (searchQuery.value.trim()) {
    const term = searchQuery.value.toLowerCase().trim()
    result = result.filter(s => s.email.toLowerCase().includes(term))
  }
  if (selectedClassFilter.value) {
    result = result.filter(s => s.class === selectedClassFilter.value)
  }
  return result
})

// Filtered list for totals (excludes instructor)
const filteredStudentsExcludingInstructor = computed(() => {
  let result = studentsExcludingInstructor.value
  if (searchQuery.value.trim()) {
    const term = searchQuery.value.toLowerCase().trim()
    result = result.filter(s => s.email.toLowerCase().includes(term))
  }
  if (selectedClassFilter.value) {
    result = result.filter(s => s.class === selectedClassFilter.value)
  }
  return result
})

// Class filter options with counts (excluding instructor)
const classFilterOptions = computed(() => {
  const options: Array<{ label: string; value: string | null; count: number }> = [
    { label: 'All Classes', value: null, count: totalStudentsExcludingInstructor.value }
  ]

  classStats.value.forEach(stat => {
    options.push({
      label: stat.className,
      value: stat.className,
      count: stat.studentCount  // already excludes instructor
    })
  })

  return options
})

// Handler for class filter change
function handleClassFilter() {
  selectedStudent.value = null
}

function handleSearch() {
  selectedStudent.value = null
}

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString()
}

function onStudentSelect(event: any) {
  selectedStudent.value = event.data
}

// Request History
async function showRequests(student: any) {
  selectedStudentForRequests.value = student
  requestsForStudent.value = []
  expandedRequestId.value = null
  showRequestsDialog.value = true
  loadingRequests.value = true

  try {
    const response = await $fetch(`/api/instructor/student-requests/${encodeURIComponent(student.email)}`, {
      method: 'GET',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {}
    }) as { success: boolean; data: any[] }

    if (response?.success && Array.isArray(response.data)) {
      requestsForStudent.value = response.data
    } else {
      requestsForStudent.value = []
    }
  } catch (error: any) {
    console.error('Error loading student requests:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.message || error?.message || 'Failed to load request history',
      life: 5000,
    })
  } finally {
    loadingRequests.value = false
  }
}

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
</script>

<style scoped>
.instructor-students-view {
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

/* Class Filter Dropdown Styles */
.class-filter-dropdown {
  min-width: 200px;
}

.class-filter-dropdown :deep(.p-dropdown) {
  border-radius: 8px;
  border: 1px solid var(--border-default);
  transition: all 0.2s;
  background: var(--surface-0);
}

.class-filter-dropdown :deep(.p-dropdown:not(.p-disabled):hover) {
  border-color: #667eea;
}

.class-filter-dropdown :deep(.p-dropdown:not(.p-disabled).p-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.class-filter-dropdown :deep(.p-dropdown-label) {
  padding: 0.75rem 1rem;
  color: var(--text-primary);
}

.filter-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-value i {
  color: #667eea;
  font-size: 0.9rem;
}

.filter-value span {
  color: var(--text-primary);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.filter-option i {
  color: #667eea;
  font-size: 0.9rem;
}

.filter-option span {
  flex: 1;
}

.class-student-count {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
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

/* Badges */
.request-count-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

.class-tag {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

.you-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
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

/* Selected Student Card */
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

.selected-user-role :deep(.p-tag) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.request-count-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 0.25rem;
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
  cursor: pointer;
}

.stat-row:hover {
  background: var(--surface-overlay);
}

.stat-row.active-filter {
  background: rgba(102, 126, 234, 0.1);
  border-left: 3px solid #667eea;
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

.stat-dot.dot-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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

.filter-indicator {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--surface-section);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #667eea;
}

.filter-indicator i {
  font-size: 0.9rem;
}

.filter-indicator span {
  flex: 1;
  color: var(--text-primary);
}

.clear-filter-btn {
  width: 24px;
  height: 24px;
  color: var(--text-muted);
}

.clear-filter-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.no-classes-placeholder {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  justify-content: center;
  padding: 1rem;
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

/* Request History Dialog Styles */
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

/* Responsive */
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
  .instructor-students-view {
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

  .class-filter-dropdown {
    width: 100%;
  }
  
  .class-filter-dropdown :deep(.p-dropdown) {
    width: 100%;
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