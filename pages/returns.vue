<template>
  <div class="returns-view">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">Returns</h1>
          <p class="page-subtitle">Mark borrowed items as returned</p>
        </div>

        <!-- Toolbar -->
        <div class="card toolbar-card">
          <div class="toolbar-content">
            <div class="search-wrapper">
              <IconField class="p-input-icon-left search-input">
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="search"
                  placeholder="Search by student email or component..."
                  class="w-full"
                  @keyup.enter="loadActiveLoans"
                />
              </IconField>
            </div>
            <div class="class-filter-wrapper">
              <Dropdown
                v-model="selectedClass"
                :options="classOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Filter by Class"
                class="class-filter-dropdown"
                showClear
              >
                <template #option="{ option }">
                  <div class="class-option">
                    <i class="pi pi-tag class-option-icon"></i>
                    <span>{{ option.label }}</span>
                  </div>
                </template>
              </Dropdown>
            </div>
            <div class="action-buttons-group">
              <Button 
                label="Search" 
                icon="pi pi-search" 
                @click="loadActiveLoans"
                class="action-btn search-btn"
              />
              <Button 
                label="Refresh" 
                icon="pi pi-refresh" 
                :loading="loading" 
                @click="loadActiveLoans"
                class="action-btn refresh-btn"
              />
            </div>
          </div>
        </div>

        <!-- Selection Toolbar -->
        <div v-if="selectedLoans.length > 0" class="card selection-toolbar">
          <div class="selection-content">
            <div class="selection-info">
              <i class="pi pi-check-circle selection-icon"></i>
              <span class="selection-count">{{ selectedLoans.length }} item(s) selected</span>
            </div>
            <div class="selection-actions">
              <Button
                label="Clear Selection"
                icon="pi pi-times"
                @click="clearSelection"
                class="clear-btn"
                text
              />
              <Button
                label="Mark Selected as Returned"
                icon="pi pi-check"
                severity="success"
                :loading="returningInProgress"
                @click="confirmReturn(selectedLoans)"
                class="batch-return-btn"
              />
            </div>
          </div>
        </div>

        <!-- Loans Table -->
        <div class="card table-card">
          <DataTable
            ref="dataTable"
            :value="filteredLoans"
            :loading="loading"
            dataKey="id"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} loans"
            responsiveLayout="scroll"
            class="custom-table"
            v-model:selection="selectedLoans"
            selectionMode="multiple"
          >
            <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

            <Column field="user.email" header="Student">
              <template #body="{ data }">
                <div class="student-info">
                  <i class="pi pi-user student-icon"></i>
                  <span>{{ data.user?.email ?? '—' }}</span>
                </div>
              </template>
            </Column>

            <Column header="Component">
              <template #body="{ data }">
                <div class="component-info">
                  <span class="component-name">{{ data.component?.model ?? '—' }}</span>
                  <span v-if="data.component?.manufacturer" class="component-manufacturer">
                    {{ data.component.manufacturer }}
                  </span>
                </div>
              </template>
            </Column>

            <Column header="Image" style="width: 80px">
              <template #body="{ data }">
                <div class="image-container">
                  <img
                    v-if="data.component?.link"
                    :src="data.component.link"
                    :alt="data.component.model"
                    class="component-thumb"
                    loading="lazy"
                    @error="handleImageError"
                  />
                  <div v-else class="no-image">
                    <i class="pi pi-image"></i>
                  </div>
                </div>
              </template>
            </Column>

            <Column field="location" header="Location">
              <template #body="{ data }">
                <Badge 
                  :value="data.component?.location ?? '—'" 
                  severity="secondary"
                  class="location-badge"
                />
              </template>
            </Column>

            <Column field="quantityBorrowed" header="Qty">
              <template #body="{ data }">
                <div class="quantity-badge">
                  {{ data.quantityBorrowed }}
                </div>
              </template>
            </Column>

            <Column field="class" header="Class">
              <template #body="{ data }">
                <Tag 
                  :value="data.class" 
                  severity="info"
                  class="class-tag"
                />
              </template>
            </Column>

            <Column header="Borrowed at">
              <template #body="{ data }">
                <div class="date-info">
                  <i class="pi pi-calendar"></i>
                  <span>{{ formatDate(data.borrowedAt) }}</span>
                </div>
              </template>
            </Column>

            <!-- Empty State Template -->
            <template #empty>
              <div class="empty-state">
                <div class="empty-state-content">
                  <i class="pi pi-check-circle empty-icon"></i>
                  <h3>No active loans</h3>
                  <p>All items have been returned</p>
                </div>
              </div>
            </template>
          </DataTable>
        </div>
      </div>
    </div>
    
    <!-- Confirmation Dialog -->
    <Dialog 
      v-model:visible="showConfirmDialog" 
      :style="{ width: '450px' }" 
      header="Confirm Return"
      :modal="true"
      class="confirm-dialog"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle warning-icon" :class="confirmSeverity" />
        <div class="confirmation-text">
          <p class="confirm-message">{{ confirmMessage }}</p>
          <p v-if="pendingItems.length > 1" class="confirm-details">
            Items: {{ pendingItems.map(item => item.component?.model).join(', ') }}
          </p>
        </div>
      </div>
      
      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="cancelReturn" 
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Confirm Return" 
          icon="pi pi-check" 
          @click="executeReturn" 
          :loading="returningInProgress"
          class="dialog-btn confirm-btn" 
          :class="confirmSeverity === 'danger' ? 'danger-gradient' : 'success-gradient'"
        />
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

const toast = useToast()
const router = useRouter()

const loans = ref<any[]>([])
const search = ref('')
const selectedClass = ref<string | null>(null)
const loading = ref(false)
const selectedLoans = ref<any[]>([])
const dataTable = ref()
const selectedForRequest = ref(null) 
// Unified return state
const returningItems = ref<Set<string>>(new Set())
const returningInProgress = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmMessage = ref('')
const confirmSeverity = ref('success')
const pendingItems = ref<any[]>([])

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
    
    // Check authorization
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
    
    loadActiveLoans()
  }
})

// Helper to check if a specific item is being returned
function isReturningItem(itemId: string): boolean {
  return returningItems.value.has(itemId)
}

async function loadActiveLoans() {
  loading.value = true
  try {
    // Build query parameters
    const queryParams = new URLSearchParams()
    if (search.value?.trim()) {
      queryParams.append('search', search.value.trim())
    }
    
    const response = await $fetch(`/api/admin/active-loans${queryParams.toString() ? '?' + queryParams.toString() : ''}`, {
      method: 'GET',
      headers: token.value ? {
        Authorization: `Bearer ${token.value}`
      } : {}
    })
    
    const result = response as { 
      success: boolean; 
      data: any[] 
    }
    
    if (result?.success && Array.isArray(result.data)) {
      loans.value = result.data
    } else {
      loans.value = []
    }
    
    // Clear selection after loading new data
    clearSelection()
  } catch (error: any) {
    console.error('Error loading active loans:', error)
    
    if (error?.status === 401 || error?.statusCode === 401) {
      router.push('/login')
      return
    }
    
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error?.data?.message || error?.message || 'Failed to load active loans', 
      life: 5000 
    })
    
    loans.value = []
  } finally {
    loading.value = false
  }
}

const classOptions = computed(() => {
  const classes = [...new Set(loans.value.map(l => l.class).filter(Boolean))]
  return classes.sort().map(c => ({ label: c, value: c }))
})

const filteredLoans = computed(() => {
  if (!selectedClass.value) return loans.value
  return loans.value.filter(loan => loan.class === selectedClass.value)
})

function formatDate(d: string | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function handleImageError(event: Event) {
  (event.target as HTMLImageElement).style.display = 'none'
}

function clearSelection() {
  selectedLoans.value = []
}

// Unified confirmation for both single and batch returns
function confirmReturn(items: any[]) {
  if (items.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No selection',
      detail: 'Please select items to return',
      life: 3000
    })
    return
  }
  
  pendingItems.value = items
  
  const itemNames = items
    .map(item => item.component?.model || 'Unknown')
    .join(', ')
  
  if (items.length === 1) {
    confirmMessage.value = `Are you sure you want to mark "${itemNames}" as returned?`
    confirmSeverity.value = 'success'
  } else {
    confirmMessage.value = `Are you sure you want to mark ${items.length} items as returned?`
    confirmSeverity.value = 'success'
  }
  
  showConfirmDialog.value = true
}

function cancelReturn() {
  showConfirmDialog.value = false
  pendingItems.value = []
}

// Unified return execution
async function executeReturn() {
  if (pendingItems.value.length === 0) return
  
  const items = pendingItems.value
  const requestIds = items.map(item => item.id)
  const isBatch = items.length > 1
  
  // Set loading states
  returningInProgress.value = true
  items.forEach(item => returningItems.value.add(item.id))
  
  try {
    const response = await $fetch('/api/admin/return-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
      },
      body: { requestIds: isBatch ? requestIds : requestIds[0] }, // Send array for batch, single ID for single
    }) as any
    
    // Show success message
    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: response.message || `Successfully returned ${items.length} item(s)`, 
      life: 5000 
    })
    
    // Remove returned items from the list
    const returnedIds = new Set(items.map(item => item.id))
    loans.value = loans.value.filter(loan => !returnedIds.has(loan.id))
    
    // Clear selection and dialog
    clearSelection()
    showConfirmDialog.value = false
    pendingItems.value = []
    
  } catch (error: any) {
    console.error('Error marking items as returned:', error)
    
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error?.data?.message || error?.message || 'Failed to mark items as returned', 
      life: 5000 
    })
  } finally {
    // Clear loading states
    returningInProgress.value = false
    items.forEach(item => returningItems.value.delete(item.id))
  }
}
</script>

<style scoped>
.returns-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.main-container {
  background: var(--surface-container);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.content-wrapper {
  max-width: 1400px;
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

/* Toolbar Card */
.toolbar-card {
  margin-bottom: 1rem;
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  background: var(--surface-card);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Selection Toolbar */
.selection-toolbar {
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selection-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selection-icon {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
}

.selection-count {
  font-weight: 600;
  font-size: 1rem;
}

.selection-actions {
  display: flex;
  gap: 0.75rem;
}

.clear-btn {
  color: white !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.batch-return-btn {
  background: #ffffff !important;
  color: #059669 !important;
  border: none !important;
  font-weight: 600;
}

body:not(.p-dark) .batch-return-btn {
  background: #ffffff !important;
  color: #059669 !important;
  border: none !important;
}

.batch-return-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

body:not(.p-dark) .batch-return-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.search-wrapper {
  flex: 1;
  min-width: 300px;
}

.class-filter-wrapper {
  min-width: 200px;
}

.class-filter-dropdown {
  width: 100%;
  border-radius: 8px;
}

.class-filter-dropdown :deep(.p-dropdown) {
  border-radius: 8px;
  border: 1px solid var(--border-default);
  transition: all 0.2s;
}

.class-filter-dropdown :deep(.p-dropdown:hover),
.class-filter-dropdown :deep(.p-dropdown.p-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.class-filter-dropdown :deep(.p-dropdown-label) {
  padding: 0.75rem 1rem;
}

.class-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.class-option-icon {
  color: #667eea;
  font-size: 0.85rem;
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
}

.search-input :deep(.p-inputtext:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.search-input :deep(.pi-search) {
  left: 1rem;
  color: var(--text-muted);
}

.action-buttons-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
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

.search-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.refresh-btn {
  background: var(--surface-0);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

/* Table Card */
.table-card {
  padding: 1.5rem;
  border: none;
  border-radius: 16px;
  background: var(--surface-card);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Custom Table Styles */
.custom-table :deep(.p-datatable-header) {
  background: transparent;
  border: none;
  padding: 0 0 1rem 0;
}

.custom-table :deep(.p-datatable-thead > tr > th) {
  background: var(--surface-0);
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

/* Selection styling */
.custom-table :deep(.p-datatable-tbody > tr.p-highlight) {
  background: var(--surface-active);
}

/* Student Info */
.student-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.student-icon {
  color: #667eea;
  font-size: 1rem;
}

/* Component Info */
.component-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.component-name {
  font-weight: 500;
  color: var(--text-primary);
}

.component-manufacturer {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Image Styles */
.image-container {
  width: 48px;
  height: 48px;
  background: var(--surface-ground);
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

/* Quantity Badge */
.quantity-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--surface-ground);
  color: var(--text-primary);
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  min-width: 60px;
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
  font-size: 0.9rem;
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
  color: var(--text-muted);
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-heading);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 1rem;
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

.custom-table :deep(.p-paginator .p-paginator-first),
.custom-table :deep(.p-paginator .p-paginator-prev),
.custom-table :deep(.p-paginator .p-paginator-next),
.custom-table :deep(.p-paginator .p-paginator-last) {
  border-radius: 8px;
  min-width: 2.5rem;
  height: 2.5rem;
  transition: all 0.2s;
}

.custom-table :deep(.p-paginator .p-paginator-first:hover),
.custom-table :deep(.p-paginator .p-paginator-prev:hover),
.custom-table :deep(.p-paginator .p-paginator-next:hover),
.custom-table :deep(.p-paginator .p-paginator-last:hover) {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.custom-table :deep(.p-paginator .p-dropdown) {
  border-radius: 8px;
  border-color: var(--border-default);
}

.custom-table :deep(.p-paginator .p-dropdown:hover) {
  border-color: #667eea;
}

.custom-table :deep(.p-paginator .p-dropdown .p-dropdown-label) {
  padding: 0.5rem 1rem;
}

.search-input :deep(.p-inputicon) {
  color: #667eea;
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

/* Confirmation Dialog */
.confirm-dialog :deep(.p-dialog-header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px 12px 0 0;
}

.confirm-dialog :deep(.p-dialog-title) {
  font-weight: 600;
  font-size: 1.25rem;
}

.confirmation-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.warning-icon {
  font-size: 2rem;
}

.warning-icon.danger {
  color: #ef4444;
}

.warning-icon.success {
  color: #10b981;
}

.dialog-btn {
  min-width: 100px;
}

.cancel-btn {
  color: var(--text-secondary) !important;
}

.confirm-btn.danger-gradient {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  color: white !important;
}

.confirm-btn.success-gradient {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  color: white !important;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Responsive Design */
@media (max-width: 900px) {
  .returns-view {
    padding: 1rem;
  }
  
  .main-container {
    padding: 1rem;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .selection-content {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  
  .selection-info {
    justify-content: center;
  }
  
  .selection-actions {
    justify-content: center;
  }
  
  .search-wrapper {
    min-width: 100%;
  }
  
  .class-filter-wrapper {
    min-width: 100%;
  }
  
  .action-buttons-group {
    justify-content: stretch;
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
  
  .custom-table :deep(.p-datatable-thead > tr > th) {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .custom-table :deep(.p-datatable-tbody > tr > td) {
    padding: 0.75rem;
  }
  
  .student-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .date-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .confirmation-content {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .header-section {
    padding: 0.75rem;
  }
  
  .page-title {
    font-size: 1.25rem;
  }
  
  .page-subtitle {
    font-size: 0.9rem;
  }
  
  .toolbar-card,
  .table-card {
    padding: 1rem;
  }
  
  .action-buttons-group {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
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
  
  .empty-state p {
    font-size: 0.9rem;
  }
  
  .selection-actions {
    flex-direction: column;
  }
  
  .dialog-btn {
    width: 100%;
  }
}

/* PrimeVue Overrides */
.custom-table :deep(.p-datatable-wrapper) {
  border-radius: 8px;
}

.custom-table :deep(.p-tag) {
  background: var(--surface-hover);
  color: var(--text-primary);
  font-weight: 500;
}

.custom-table :deep(.p-badge) {
  background: var(--surface-hover);
  color: var(--text-primary);
  font-weight: 500;
}

/* Scrollbar Styling */
.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-track {
  background: var(--surface-ground);
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
body.p-dark .batch-return-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #ffffff !important;
  border: none !important;
  font-weight: 600;
}

body.p-dark .batch-return-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #9b6bb8 100%) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>