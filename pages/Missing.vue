<!-- src/views/MissingView.vue -->
<template>
  <div class="missing-view">
    <Navbar />
    
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <div>
            <h1 class="text-3xl font-bold text-surface-900">
              Missing Items Requests
            </h1>
            <br />
            <p class="text-surface-600 mt-2">
              Manage requests for items not in inventory
            </p>
          </div>
          <br />
          <div class="flex items-center gap-4">
          </div>
        </div>

        <!-- Search and Tools -->
        <div class="card mb-6">
          <div class="flex justify-between items-left p-4">
            <div class="flex items-center gap-4 w-full">
              <span class="p-input-icon-left w-full md:w-96">
                <i class="pi pi-search" />
                <InputText 
                  v-model="searchQuery" 
                  placeholder="Search across all columns..." 
                  class="w-full"
                  @input="handleSearch"
                />
              </span>
            </div>
            <br>
            <div class="flex items-center gap-2">
              <Button 
                label="Refresh" 
                icon="pi pi-refresh" 
                @click="loadData"
                :loading="loading"
              />
              <Button 
                label="Export CSV"
                icon="pi pi-file-export" 
                class="ml-4"
                @click="exportCSV(filteredMissingItems, 'missing_items_export.csv')"
              />
            </div>
          </div>
        </div>
        <br>
        <!-- Main Content Area -->
        <div class="main-content-area">
          <!-- Table Section -->
          <div class="table-section">
            <!-- DataTable -->
            <div class="card">
              <DataTable
                :value="filteredMissingItems"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                :loading="loading"
                v-model:selection="selectedMissingItem"
                selectionMode="single"
                dataKey="id"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} requests"
                responsiveLayout="scroll"
                class="p-datatable-sm"
                sortField="id"
                :sortOrder="-1"
              >
                <!-- ID Column -->
                <Column field="id" header="ID" :sortable="true">
                  <template #body="{ data }">
                    <Badge :value="data.id" severity="info" />
                  </template>
                </Column>

                <!-- Model Column -->
                <Column field="model" header="Model Name" :sortable="true">
                  <template #body="{ data }">
                    <span class="font-medium">{{ data.model }}</span>
                  </template>
                </Column>

                <!-- link Column -->
        <Column field="link" header="Link" :sortable="true">
          <template #body="{ data }">
            <a v-if="data.description" 
              :href="data.description" 
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline font-medium">
              {{data.model || 'View Link' }}
              <i class="pi pi-external-link ml-1 text-xs"></i>
            </a>
            <span v-else class="text-surface-600 italic">
              No link
            </span>
          </template>
        </Column>

                <!-- Student Email Column -->
                <Column field="student" header="Student Email" :sortable="true" />

                <!-- Class Column -->
                <Column field="class" header="Class" :sortable="true">
                  <template #body="{ data }">
                    <Tag :value="data.class" severity="info" rounded />
                  </template>
                </Column>

                <!-- Quantity Column -->
                <Column field="quantity" header="Quantity" :sortable="true">
                  <template #body="{ data }">
                    <Badge 
                      :value="data.quantity" 
                      :severity="getQuantitySeverity(data.quantity)"
                    />
                  </template>
                </Column>

                <!-- Created At Column -->
                <Column field="timestamp" header="Requested At" :sortable="true">
                  <template #body="{ data }">
                    {{ formatDate(data.timestamp) }}
                  </template>
                </Column>
              </DataTable>
            </div>

            <!-- Selection Summary -->
            <div v-if="selectedMissingItem" class="mt-4 p-4 bg-primary-50 rounded-lg">
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-medium text-primary-900">
                    1 request selected
                  </span>
                  <p class="text-sm text-primary-700 mt-1">
                    Model: {{ selectedMissingItem?.model }}
                  </p>
                  <p class="text-sm text-primary-700 mt-1">
                    Quantity: {{ selectedMissingItem?.quantity || 0 }}
                  </p>
                </div>
                <Button 
                  label="Clear Selection" 
                  text 
                  size="small"
                  @click="selectedMissingItem = null"
                />
              </div>
            </div>

            <!-- Stats Cards -->
            <br>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div class="card text-center p-6">
                <div class="text-3xl font-bold text-primary-600">{{ totalMissingItems }}</div>
                <div class="text-surface-600 mt-2">Total Requests</div>
              </div>
              <br>
              <div class="card text-center p-6">
                <div class="text-3xl font-bold text-green-600">{{ highQuantityMissingItems }}</div>
                <div class="text-surface-600 mt-2">High Quantity (5+)</div>
              </div>
              <br>
              <div class="card text-center p-6">
                <div class="text-3xl font-bold text-blue-600">{{ recentMissingItems }}</div>
                <div class="text-surface-600 mt-2">Last 24 Hours</div>
              </div>
            </div>
          </div>

          <!-- Sidebar Actions -->
          <div class="sidebar-section">
            <div class="card sticky-sidebar">
              <div class="flex flex-col">
                <!-- User Info -->
                <div class="p-4 border-b">
                  <div class="text-lg font-semibold text-surface-900"><strong>Quick Actions</strong></div>
                </div>
                <br/>

                <!-- Admin Actions -->
                <div class="p-4">
                  <div class="space-y-3">
                    <Button 
                      label="Update Selected" 
                      icon="pi pi-pencil" 
                      class="w-full justify-start"
                      @click="editSelectedMissingItem"
                      :disabled="!selectedMissingItem"
                      v-tooltip="'Update selected request'"
                    />
                    <Button 
                      label="Delete Selected" 
                      icon="pi pi-trash" 
                      class="w-full justify-start"
                      severity="danger"
                      @click="deleteSelectedMissingItem"
                      :disabled="!selectedMissingItem"
                      v-tooltip="'Delete selected request'"
                    />
                  </div>
                </div>
                <br/>
                <!-- Selection Info -->
                <div v-if="selectedMissingItem" class="p-4 border-t">
                  <div class="text-sm font-medium text-surface-700 mb-2">Selected Request:</div>
                  <div class="text-xs text-surface-600 space-y-1">
                    <div>ID: {{ selectedMissingItem.id }}</div>
                    <div>Model: {{ selectedMissingItem.model }}</div>
                    <div>Student: {{ selectedMissingItem.student }}</div>
                    <div>Class: {{ selectedMissingItem.class }}</div>
                    <div>Quantity: {{ selectedMissingItem.quantity }}</div>
                    <div>Requested: {{ formatDate(selectedMissingItem.timestamp) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Update Missing Item Dialog -->
    <Dialog 
      v-model:visible="showEditDialog" 
      :style="{ width: '500px' }" 
      header="Update Missing Item Request"
      :modal="true"
    >
      <div class="p-fluid">
        <div class="field">
          <label for="editModel">Model Name </label>
          <InputText 
            id="editModel"
            v-model="editForm.model"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field">
          <label for="editDescription">Description </label>
          <InputText 
            id="editDescription"
            v-model="editForm.description"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field">
          <label for="editStudent">Student Email </label>
          <InputText 
            id="editStudent"
            v-model="editForm.student"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field">
          <label for="editClass">Class </label>
          <InputText 
            id="editClass"
            v-model="editForm.class"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field">
          <label for="editQuantity">Quantity </label>
          <InputNumber 
            id="editQuantity"
            v-model="editForm.quantity"
            :min="1"
            showButtons
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
          @click="updateMissingItem"
          autofocus
          :loading="updatingItem"
        />
      </template>
    </Dialog>

    <!-- Confirmation Dialog -->
    <Dialog 
      v-model:visible="showConfirmDialog" 
      :style="{ width: '450px' }" 
      header="Confirmation"
      :modal="true"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span>{{ confirmMessage }}</span>
      </div>
      
      <template #footer>
        <Button 
          label="No" 
          icon="pi pi-times" 
          @click="showConfirmDialog = false" 
          class="p-button-text"
          severity="secondary"
        />
        <Button 
          label="Yes" 
          icon="pi pi-check" 
          @click="confirmAction" 
          autofocus
          :loading="confirmLoading"
          :severity="confirmSeverity"
        />
      </template>
    </Dialog>

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dialog from 'primevue/dialog'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import { useToast } from 'primevue/usetoast'
import Navbar from '@/components/Navbar.vue'
import { exportCSV } from '@/utils/exportCSV.js'

const vTooltip = Tooltip

const router = useRouter()
const toast = useToast()
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// State
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const missingItems = ref([])
const loading = ref(false)
const selectedMissingItem = ref(null)
const searchQuery = ref('')

// Dialog states
const showEditDialog = ref(false)
const updatingItem = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmLoading = ref(false)
const confirmActionType = ref('')
const confirmMessage = ref('')
const confirmSeverity = ref('danger')
const confirmCallback = ref(null)

// Edit form
const editForm = ref({
  id: null,
  model: '',
  description: '',
  student: '',
  class: '',
  quantity: 1
})

onMounted(() => {
  checkAdminAccess()
  loadData()
})

// Check if user is admin
const checkAdminAccess = () => {
  const userRole = user.value?.role
  if (userRole !== 'admin') {
    toast.add({
      severity: 'error',
      summary: 'Access Denied',
      detail: 'Only administrators can access this page',
      life: 3000
    })
    router.push('/')
  }
}

// Computed properties
const totalMissingItems = computed(() => missingItems.value.length)
const highQuantityMissingItems = computed(() => missingItems.value.filter(r => r.quantity >= 5).length)
const recentMissingItems = computed(() => {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
  return missingItems.value.filter(r => {
    const requestDate = new Date(r.timestamp)
    return requestDate >= twentyFourHoursAgo
  }).length
})

// Filter missing items based on search
const filteredMissingItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return [...missingItems.value].sort((a, b) => (b.id || 0) - (a.id || 0)) // Newest first
  }
  
  const searchTerm = searchQuery.value.toLowerCase().trim()
  return missingItems.value.filter(item => {
    return Object.values(item).some(value => {
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(searchTerm)
    })
  }).sort((a, b) => (b.id || 0) - (a.id || 0))
})

// Load data
const loadData = async () => {
  loading.value = true
  try {
    const response = await fetch(apiUrl + '/missing/', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success && data.data) {
      missingItems.value = data.data.sort((a, b) => (b.id || 0) - (a.id || 0))
      
      toast.add({
        severity: 'success',
        summary: 'Data Loaded',
        detail: `Loaded ${data.data.length} missing item requests`,
        life: 3000
      })
    } else {
      throw new Error(data.message || 'Failed to load data')
    }
  } catch (error) {
    console.error('Error loading missing items:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load missing items data',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Show confirmation dialog
const showConfirmation = (actionType, message, severity = 'danger', callback) => {
  confirmActionType.value = actionType
  confirmMessage.value = message
  confirmSeverity.value = severity
  confirmCallback.value = callback
  showConfirmDialog.value = true
}

// Handle confirmed action
const confirmAction = async () => {
  confirmLoading.value = true
  
  try {
    if (confirmCallback.value) {
      await confirmCallback.value()
    }
    showConfirmDialog.value = false
  } catch (error) {
    console.error('Error in confirmation action:', error)
  } finally {
    confirmLoading.value = false
  }
}

// Edit missing item
const editMissingItem = (item) => {
  selectedMissingItem.value = item
  openEditDialog()
}

const editSelectedMissingItem = () => {
  if (!selectedMissingItem.value) {
    toast.add({
      severity: 'warn',
      summary: 'No Request Selected',
      detail: 'Please select a request first',
      life: 3000
    })
    return
  }
  openEditDialog()
}

const openEditDialog = () => {
  editForm.value = {
    id: selectedMissingItem.value.id,
    model: selectedMissingItem.value.model,
    description: selectedMissingItem.value.description || '',
    student: selectedMissingItem.value.student,
    class: selectedMissingItem.value.class,
    quantity: selectedMissingItem.value.quantity
  }
  showEditDialog.value = true
}

// Update missing item
const updateMissingItem = async () => {
  if (!editForm.value.id) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No request ID found',
      life: 3000
    })
    return
  }

  updatingItem.value = true
  
  try {
    const response = await fetch(`${apiUrl}/missing/${editForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        id: editForm.value.id,
        model: editForm.value.model,
        model_description: editForm.value.description,
        student_email: editForm.value.student,
        class_name: editForm.value.class,
        quantity: editForm.value.quantity
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      toast.add({
        severity: 'success',
        summary: 'Request Updated',
        detail: 'Missing item request has been updated successfully',
        life: 3000
      })
      
      // Update local data
      const index = missingItems.value.findIndex(r => r.id === editForm.value.id)
      if (index !== -1) {
        missingItems.value[index] = { ...missingItems.value[index], ...editForm.value }
      }
      
      showEditDialog.value = false
      selectedMissingItem.value = null
    } else {
      throw new Error(data.message || 'Failed to update request')
    }
  } catch (error) {
    console.error('Error updating missing item request:', error)
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: error.message || 'Failed to update request',
      life: 5000
    })
  } finally {
    updatingItem.value = false
  }
}

// Delete missing item
const deleteMissingItem = (item) => {
  selectedMissingItem.value = item
  deleteSelectedMissingItem()
}

const deleteSelectedMissingItem = () => {
  if (!selectedMissingItem.value) {
    toast.add({
      severity: 'warn',
      summary: 'No Request Selected',
      detail: 'Please select a request to delete',
      life: 3000
    })
    return
  }

  showConfirmation(
    'delete',
    `Are you sure you want to delete this request for "${selectedMissingItem.value.model}"?`,
    'danger',
    async () => {
      const itemId = selectedMissingItem.value.id
      
      try {
        const response = await fetch(`${apiUrl}/missing/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success) {
          toast.add({
            severity: 'success',
            summary: 'Request Deleted',
            detail: 'Missing item request has been deleted successfully',
            life: 3000
          })
          loadData()
          selectedMissingItem.value = null
        } else {
          throw new Error(data.message || 'Failed to delete request')
        }
      } catch (error) {
        console.error('Error deleting missing item request:', error)
        toast.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error.message || 'Failed to delete request',
          life: 5000
        })
        throw error
      }
    }
  )
}

// Handle search
const handleSearch = () => {
  // Optional: Add debounce here if needed
}

// Helper functions
const getQuantitySeverity = (quantity) => {
  if (quantity === 0) return 'danger'
  if (quantity < 3) return 'warning'
  if (quantity < 5) return 'info'
  return 'success'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.missing-view {
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
  margin-bottom: 2rem;
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
  width: 280px;
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

.grid {
  display: grid;
}

.ml-4 {
  margin-left: 1rem;
}

.table-section,
.sidebar-section {
  margin-top: 0;
}

.space-y-3 {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 1rem;
}

.sidebar-section .card {
  margin-top: 1rem;
}

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
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