<template>
  <div class="logs-view">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">System Logs</h1>
          <p class="page-subtitle">Filterable audit log of system actions</p>
        </div>

        <!-- Filter Toolbar -->
        <div class="card toolbar-card">
          <div class="filter-row">
            <div class="filter-group">
              <span class="p-input-icon-left filter-input-wrapper">
                <i class="pi pi-search" />
                <InputText
                  v-model="filterUserEmail"
                  placeholder="Filter by user email..."
                  class="filter-input"
                  @keyup.enter="loadLogs(1)"
                />
              </span>
              <Select
                v-model="filterAction"
                :options="actionOptions"
                option-label="label"
                option-value="value"
                placeholder="All actions"
                class="filter-select"
              />
            </div>
            <div class="action-buttons-group">
              <Button 
                label="Apply" 
                icon="pi pi-filter" 
                @click="loadLogs(1)"
                class="action-btn filter-btn"
              />
              <Button 
                label="Refresh" 
                icon="pi pi-refresh" 
                :loading="loading" 
                @click="loadLogs(page)"
                class="action-btn refresh-btn"
              />
            </div>
          </div>
        </div>

        <!-- Logs Table -->
        <div class="card table-card">
          <DataTable
            :value="logs"
            :loading="loading"
            dataKey="_id"
            :paginator="true"
            :rows="pagination.limit"
            :rowsPerPageOptions="[10, 25, 50, 100]"
            :totalRecords="pagination.total"
            :lazy="true"
            @page="onPage"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
            responsiveLayout="scroll"
            class="custom-table"
          >
            <Column field="action" header="Action">
              <template #body="{ data }">
                <Tag 
                  :value="formatAction(data.action)" 
                  :severity="actionSeverity(data.action)"
                  class="action-tag"
                />
              </template>
            </Column>

            <Column field="userEmail" header="Actor">
              <template #body="{ data }">
                <div class="actor-info">
                  <i class="pi pi-user actor-icon"></i>
                  <span>{{ data.userEmail }}</span>
                </div>
              </template>
            </Column>

            <Column field="userRole" header="Role">
              <template #body="{ data }">
                <Badge 
                  :value="data.userRole" 
                  severity="info"
                  class="role-badge"
                />
              </template>
            </Column>

            <Column field="timestamp" header="Timestamp">
              <template #body="{ data }">
                <div class="timestamp-info">
                  <i class="pi pi-calendar"></i>
                  <span>{{ formatDate(data.timestamp) }}</span>
                </div>
              </template>
            </Column>

            <Column header="Details" style="min-width: 300px">
              <template #body="{ data }">
                <div class="details-cell">
                  <span class="metadata-text">{{ metadataSummary(data) }}</span>
                  <Button 
                    icon="pi pi-eye" 
                    class="details-button"
                    @click="showDetails(data)"
                    :disabled="!hasDetails(data)"
                    v-tooltip.top="'View details'"
                    text
                    rounded
                  />
                </div>
              </template>
            </Column>

            <!-- Empty State Template -->
            <template #empty>
              <div class="empty-state">
                <div class="empty-state-content">
                  <i class="pi pi-history empty-icon"></i>
                  <h3>No logs found</h3>
                  <p>Try adjusting your filters</p>
                </div>
              </div>
            </template>
          </DataTable>
        </div>
      </div>
    </div>

    <!-- Details Dialog -->
    <Dialog 
      v-model:visible="detailsDialogVisible" 
      :header="dialogTitle" 
      :style="{ width: '800px' }" 
      class="custom-dialog details-dialog"
      :modal="true"
      :dismissableMask="true"
    >
      <div v-if="selectedLog" class="dialog-content">
        <!-- Metadata Section -->
        <div class="metadata-section">
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Action:</span>
              <Tag 
                :value="formatAction(selectedLog.action)" 
                :severity="actionSeverity(selectedLog.action)"
                class="action-tag-large"
              />
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Actor:</span>
              <span class="metadata-value">{{ selectedLog.userEmail }}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Role:</span>
              <Badge :value="selectedLog.userRole" severity="info" />
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Timestamp:</span>
              <span class="metadata-value">{{ formatDate(selectedLog.timestamp) }}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">IP Address:</span>
              <span class="metadata-value">{{ selectedLog.ip || 'N/A' }}</span>
            </div>
            <div v-if="selectedLog.userAgent" class="metadata-item full-width">
              <span class="metadata-label">User Agent:</span>
              <span class="metadata-value user-agent">{{ selectedLog.userAgent }}</span>
            </div>
            <div v-if="selectedLog.metadata?.entityId" class="metadata-item">
              <span class="metadata-label">Entity ID:</span>
              <span class="metadata-value entity-id">{{ formatObjectId(selectedLog.metadata.entityId) }}</span>
            </div>
            <div v-if="selectedLog.metadata?.entityType" class="metadata-item">
              <span class="metadata-label">Entity Type:</span>
              <span class="metadata-value">{{ selectedLog.metadata.entityType }}</span>
            </div>
          </div>
        </div>

        <Divider />

        <!-- UPDATE Action - Show Changes -->
        <div v-if="isUpdateAction(selectedLog.action)" class="changes-section">
          <h3 class="section-title">Changes Made</h3>
          
          <!-- Component Details -->
          <div v-if="selectedLog.metadata?.componentDetails" class="component-details">
            <h4 class="subsection-title">Component</h4>
            <div class="details-grid">
              <div v-if="selectedLog.metadata.componentDetails.model" class="detail-card">
                <span class="detail-label">Model</span>
                <span class="detail-value">{{ selectedLog.metadata.componentDetails.model }}</span>
              </div>
              <div v-if="selectedLog.metadata.componentDetails.description" class="detail-card">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ selectedLog.metadata.componentDetails.description }}</span>
              </div>
            </div>
          </div>

          <!-- Changes List -->
          <div v-if="selectedLog.metadata?.changes" class="changes-list">
            <h4 class="subsection-title">Fields Updated</h4>
            <div v-for="(change, index) in selectedLog.metadata.changes" :key="index" class="change-card">
              <div class="change-field">
                <Chip :label="change.field" class="field-chip" />
              </div>
              <div class="change-values">
                <div class="value-box old">
                  <span class="value-label">Before</span>
                  <span class="value">{{ formatValue(change.oldValue) }}</span>
                </div>
                <div class="value-arrow">
                  <i class="pi pi-arrow-right"></i>
                </div>
                <div class="value-box new">
                  <span class="value-label">After</span>
                  <span class="value">{{ formatValue(change.newValue) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary Cards (alternative view) -->
          <div v-else-if="selectedLog.metadata?.before || selectedLog.metadata?.after" class="state-comparison">
            <div v-if="selectedLog.metadata.before" class="state-card before">
              <div class="state-header">
                <i class="pi pi-history"></i>
                <h4>Before</h4>
              </div>
              <pre class="state-content">{{ formatJSON(selectedLog.metadata.before) }}</pre>
            </div>
            <div v-if="selectedLog.metadata.after" class="state-card after">
              <div class="state-header">
                <i class="pi pi-check-circle"></i>
                <h4>After</h4>
              </div>
              <pre class="state-content">{{ formatJSON(selectedLog.metadata.after) }}</pre>
            </div>
          </div>

          <!-- Quantity Change Highlight -->
          <div v-if="selectedLog.metadata?.quantity" class="quantity-highlight">
            <h4 class="subsection-title">Quantity Update</h4>
            <div class="quantity-change">
              <div class="quantity-box old">
                <span class="quantity-label">Previous</span>
                <span class="quantity-value">{{ selectedLog.metadata.quantity.previous }}</span>
              </div>
              <i class="pi pi-arrow-right quantity-arrow"></i>
              <div class="quantity-box new">
                <span class="quantity-label">New</span>
                <span class="quantity-value">{{ selectedLog.metadata.quantity.new }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CREATE Action -->
        <div v-else-if="isCreateAction(selectedLog.action)" class="create-section">
          <h3 class="section-title">Created {{ selectedLog.metadata?.entityType || 'Item' }}</h3>
          
          <!-- Component Details -->
          <div v-if="selectedLog.metadata?.componentDetails" class="component-details">
            <div class="details-grid">
              <div v-if="selectedLog.metadata.componentDetails.model" class="detail-card">
                <span class="detail-label">Model</span>
                <span class="detail-value">{{ selectedLog.metadata.componentDetails.model }}</span>
              </div>
              <div v-if="selectedLog.metadata.componentDetails.description" class="detail-card">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ selectedLog.metadata.componentDetails.description }}</span>
              </div>
            </div>
          </div>

          <!-- Created Data -->
          <div class="state-card after">
            <div class="state-header">
              <i class="pi pi-plus-circle"></i>
              <h4>New Values</h4>
            </div>
            <pre class="state-content">{{ formatJSON(selectedLog.metadata.after || selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- DELETE Action -->
        <div v-else-if="isDeleteAction(selectedLog.action)" class="delete-section">
          <h3 class="section-title">Deleted {{ selectedLog.metadata?.entityType || 'Item' }}</h3>
          
          <!-- Component Details -->
          <div v-if="selectedLog.metadata?.componentDetails" class="component-details">
            <div class="details-grid">
              <div v-if="selectedLog.metadata.componentDetails.model" class="detail-card">
                <span class="detail-label">Model</span>
                <span class="detail-value">{{ selectedLog.metadata.componentDetails.model }}</span>
              </div>
              <div v-if="selectedLog.metadata.componentDetails.description" class="detail-card">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ selectedLog.metadata.componentDetails.description }}</span>
              </div>
            </div>
          </div>

          <!-- Deleted Data -->
          <div class="state-card before">
            <div class="state-header">
              <i class="pi pi-trash"></i>
              <h4>Deleted Values</h4>
            </div>
            <pre class="state-content">{{ formatJSON(selectedLog.metadata.before || selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- REQUEST Actions -->
        <div v-else-if="isRequestAction(selectedLog.action)" class="request-section">
          <h3 class="section-title">Request {{ getRequestAction(selectedLog.action) }}</h3>
          <div class="state-card info">
            <div class="state-header">
              <i class="pi pi-shopping-cart"></i>
              <h4>Request Details</h4>
            </div>
            <pre class="state-content">{{ formatJSON(selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- Default View -->
        <div v-else class="default-section">
          <h3 class="section-title">Details</h3>
          <div class="state-card info">
            <div class="state-header">
              <i class="pi pi-info-circle"></i>
              <h4>Log Details</h4>
            </div>
            <pre class="state-content">{{ formatJSON(selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- Reason -->
        <div v-if="selectedLog.metadata?.reason" class="reason-section">
          <h4 class="subsection-title">Reason</h4>
          <div class="reason-box">
            <i class="pi pi-comment"></i>
            <p>{{ selectedLog.metadata.reason }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <Button 
          label="Close" 
          icon="pi pi-times" 
          @click="detailsDialogVisible = false" 
          class="dialog-btn cancel-btn"
          text
        />
      </template>
    </Dialog>

    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

definePageMeta({ 
  middleware: 'auth', 
  requiresAuth: true 
})

const toast = useToast()
const router = useRouter()
const logs = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const filterUserEmail = ref('')
const filterAction = ref<string | null>(null)
const pagination = reactive({ page: 1, limit:10, total: 0, pages: 0 })

// Dialog state
const detailsDialogVisible = ref(false)
const selectedLog = ref<any>(null)
const dialogTitle = computed(() => {
  if (!selectedLog.value) return 'Log Details'
  const action = selectedLog.value.action
  if (action.includes('CREATE')) return 'Create Details'
  if (action.includes('UPDATE')) return 'Update Details'
  if (action.includes('DELETE')) return 'Delete Details'
  if (action.includes('APPROVE')) return 'Approve Details'
  if (action.includes('DECLINE')) return 'Decline Details'
  if (action.includes('RETURN')) return 'Return Details'
  return 'Log Details'
})

const actionOptions = [
  { label: 'All actions', value: null },
  { label: 'Request approve', value: 'REQUEST_APPROVE' },
  { label: 'Request decline', value: 'REQUEST_DECLINE' },
  { label: 'Request return', value: 'REQUEST_RETURN' },
  { label: 'Inventory update', value: 'INVENTORY_UPDATE' },
  { label: 'Inventory create', value: 'INVENTORY_CREATE' },
  { label: 'Inventory delete', value: 'INVENTORY_DELETE' },
  { label: 'User create', value: 'USER_CREATE' },
  { label: 'User update', value: 'USER_UPDATE' },
  { label: 'User delete', value: 'USER_DELETE' },
]

// Get auth token and user
const token = ref('')
const user = ref<any>(null)

onMounted(() => {
  // Get token and user from localStorage
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
        detail: 'Technician or admin only', 
        life: 3000 
      })
      router.push('/home')
      return
    }
    
    loadLogs(1)
  }
})

// For Nuxt server routes, we don't need to construct full URLs
// Just use relative paths that match your server/api structure
async function loadLogs(pageNum: number) {
  page.value = pageNum
  loading.value = true
  
  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: String(pageNum),
      limit: String(pagination.limit),
    })
    
    if (filterUserEmail.value?.trim()) {
      queryParams.append('userEmail', filterUserEmail.value.trim())
    }
    
    if (filterAction.value) {
      queryParams.append('action', filterAction.value)
    }
    
    // For Nuxt server routes, use the correct path based on your file structure
    // If your file is at: server/api/admin/logs/index.get.ts
    // Then the endpoint is: /api/admin/logs
    const response = await $fetch(`/api/admin/logs?${queryParams.toString()}`, {
      method: 'GET',
      headers: token.value ? {
        Authorization: `Bearer ${token.value}`
      } : {}
    })
    
    // Handle the response
    const result = response as { 
      success: boolean; 
      data: any[]; 
      pagination: { 
        page: number; 
        limit: number; 
        total: number; 
        pages: number 
      } 
    }
    
    if (result?.success && Array.isArray(result.data)) {
      logs.value = result.data
      if (result.pagination) {
        pagination.page = result.pagination.page
        pagination.limit = result.pagination.limit
        pagination.total = result.pagination.total
        pagination.pages = result.pagination.pages
      }
    } else {
      logs.value = []
    }
  } catch (error: any) {
    console.error('Error loading logs:', error)
    
    // Handle unauthorized
    if (error?.status === 401 || error?.statusCode === 401) {
      router.push('/login')
      return
    }
    
    // Show error toast
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error?.data?.message || error?.message || 'Failed to load logs', 
      life: 5000 
    })
    
    logs.value = []
  } finally {
    loading.value = false
  }
}

function onPage(event: any) {
  if (event.rows != null && event.rows !== pagination.limit) {
    pagination.limit = event.rows
    page.value = 1
  } else {
    page.value = (event.page ?? 0) + 1
  }
  loadLogs(page.value)
}

function formatDate(d: string | Date | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString()
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ')
}

function actionSeverity(action: string) {
  if (action?.includes('APPROVE') || action?.includes('RETURN')) return 'success'
  if (action?.includes('DECLINE') || action?.includes('DELETE')) return 'danger'
  if (action?.includes('CREATE')) return 'info'
  if (action?.includes('UPDATE')) return 'warning'
  return 'info'
}

// Action type checkers
function isUpdateAction(action: string) {
  return action?.includes('UPDATE')
}

function isCreateAction(action: string) {
  return action?.includes('CREATE')
}

function isDeleteAction(action: string) {
  return action?.includes('DELETE')
}

function isRequestAction(action: string) {
  return action?.includes('REQUEST')
}

function getRequestAction(action: string) {
  return action.replace('REQUEST_', '').toLowerCase()
}

function formatObjectId(objId: any) {
  if (!objId) return 'N/A'
  if (typeof objId === 'string') return objId
  if (objId.$oid) return objId.$oid
  return String(objId)
}

function formatValue(value: any) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function metadataSummary(log: any) {
  if (!log?.metadata) return '—'
  const meta = log.metadata
  const parts = []
  
  // Add component model if available
  if (meta.componentDetails?.model) {
    parts.push(meta.componentDetails.model)
  }
  
  // Add reason if available
  if (meta.reason) {
    parts.push(meta.reason)
  }
  
  // Add change summary for updates
  if (isUpdateAction(log.action) && meta.changes) {
    const fields = meta.changes.map((c: any) => c.field).join(', ')
    parts.push(`Changed: ${fields}`)
  }
  
  // Add quantity change if available
  if (meta.quantity?.change) {
    parts.push(`Quantity: ${meta.quantity.change > 0 ? '+' : ''}${meta.quantity.change}`)
  }
  
  return parts.length ? parts.join(' · ') : 'View details'
}

function hasDetails(log: any) {
  return log?.metadata && Object.keys(log.metadata).length > 0
}

function showDetails(log: any) {
  selectedLog.value = log
  detailsDialogVisible.value = true
}

function formatJSON(obj: any) {
  if (!obj) return '{}'
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>

<style scoped>
.logs-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.main-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
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
  color: #666;
  margin: 0;
  font-size: 1.1rem;
}

/* Toolbar Card */
.toolbar-card {
  margin-bottom: 2rem;
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

.filter-input-wrapper {
  flex: 1;
  min-width: 250px;
}

.filter-input {
  width: 100%;
}

.filter-input :deep(.p-inputtext) {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  transition: all 0.2s;
}

.filter-input :deep(.p-inputtext:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.filter-input :deep(.pi-search) {
  left: 1rem;
  color: #999;
}

.filter-select {
  width: 200px;
}

.filter-select :deep(.p-dropdown) {
  width: 100%;
  border-radius: 8px;
  border-color: #e5e7eb;
  height: 47px;
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

.filter-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.refresh-btn {
  background: white;
  color: #333;
  border: 1px solid #e5e7eb;
}

/* Table Card */
.table-card {
  padding: 1.5rem;
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Custom Table Styles */
.custom-table :deep(.p-datatable-thead > tr > th) {
  background: #f8f9fa;
  color: #333;
  font-weight: 600;
  padding: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.custom-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.2s;
}

.custom-table :deep(.p-datatable-tbody > tr:hover) {
  background: #f8f9fa;
}

.custom-table :deep(.p-datatable-tbody > tr > td) {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

/* Action Tag */
.action-tag {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  font-weight: 500;
}

/* Actor Info */
.actor-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.actor-icon {
  color: #667eea;
  font-size: 0.9rem;
}

/* Role Badge */
.role-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

/* Timestamp Info */
.timestamp-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
}

.timestamp-info i {
  color: #667eea;
  font-size: 0.9rem;
}

/* Details Cell */
.details-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 400px;
}

.metadata-text {
  font-size: 0.85rem;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.details-button {
  flex-shrink: 0;
  color: #667eea !important;
  transition: all 0.2s;
}

.details-button:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.1) !important;
  transform: scale(1.1);
}

.details-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #64748b;
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
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Metadata Section */
.metadata-section {
  background: #f8f9fa;
  padding: 1.25rem;
  border-radius: 12px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadata-item.full-width {
  grid-column: 1 / -1;
}

.metadata-label {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metadata-value {
  font-weight: 500;
  color: #333;
  word-break: break-word;
}

.metadata-value.user-agent {
  font-size: 0.85rem;
  color: #666;
  font-family: monospace;
}

.metadata-value.entity-id {
  font-family: monospace;
  font-size: 0.85rem;
}

.action-tag-large {
  font-size: 0.95rem;
  padding: 0.35rem 1rem;
  width: fit-content;
}

/* Section Titles */
.section-title {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.subsection-title {
  margin: 0 0 0.75rem 0;
  color: #555;
  font-size: 1rem;
  font-weight: 600;
}

/* Component Details */
.component-details {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.detail-card {
  background: white;
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}

.detail-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.detail-value {
  font-weight: 500;
  color: #333;
  word-break: break-word;
}

/* Changes List */
.changes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.change-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid #2196f3;
}

.change-field {
  margin-bottom: 0.75rem;
}

.field-chip {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 500;
}

.field-chip :deep(.p-chip-text) {
  font-size: 0.85rem;
}

.change-values {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.value-box {
  flex: 1;
  min-width: 150px;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.value-box.old {
  border-left: 3px solid #f59e0b;
}

.value-box.new {
  border-left: 3px solid #10b981;
}

.value-label {
  display: block;
  font-size: 0.7rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.value {
  font-weight: 600;
  font-family: monospace;
  word-break: break-word;
}

.value-box.old .value {
  color: #f59e0b;
}

.value-box.new .value {
  color: #10b981;
}

.value-arrow {
  color: #667eea;
  font-size: 1.2rem;
}

/* State Cards */
.state-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.state-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.state-card.before {
  border-left: 4px solid #f59e0b;
}

.state-card.after {
  border-left: 4px solid #10b981;
}

.state-card.info {
  border-left: 4px solid #667eea;
}

.state-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
}

.state-header i {
  color: #667eea;
}

.state-header h4 {
  margin: 0;
  color: #333;
  font-size: 0.9rem;
  font-weight: 600;
}

.state-content {
  margin: 0;
  padding: 1rem;
  font-size: 0.85rem;
  background: #f8f9fa;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

/* Quantity Highlight */
.quantity-highlight {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.quantity-change {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
}

.quantity-box {
  text-align: center;
}

.quantity-box.old .quantity-value {
  color: #f59e0b;
}

.quantity-box.new .quantity-value {
  color: #10b981;
}

.quantity-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.quantity-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.quantity-arrow {
  color: #667eea;
  font-size: 1.5rem;
}

/* Reason Section */
.reason-section {
  margin-top: 0.5rem;
}

.reason-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff3e0;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.reason-box i {
  color: #f59e0b;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.reason-box p {
  margin: 0;
  color: #e65100;
  line-height: 1.5;
}

/* Dialog Footer */
.dialog-btn {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
}

.dialog-btn.cancel-btn {
  color: #64748b;
}

.dialog-btn.cancel-btn:hover {
  background: #f1f5f9;
}

/* Divider */
.divider {
  margin: 0.5rem 0;
  border-color: #e5e7eb;
}

/* Scrollbar Styling */
.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar,
.state-content::-webkit-scrollbar,
.custom-dialog :deep(.p-dialog-content)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-track,
.state-content::-webkit-scrollbar-track,
.custom-dialog :deep(.p-dialog-content)::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb,
.state-content::-webkit-scrollbar-thumb,
.custom-dialog :deep(.p-dialog-content)::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover,
.state-content::-webkit-scrollbar-thumb:hover,
.custom-dialog :deep(.p-dialog-content)::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .metadata-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .state-comparison {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .logs-view {
    padding: 1rem;
  }
  
  .main-container {
    padding: 1rem;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    flex-direction: column;
  }
  
  .filter-input-wrapper,
  .filter-select {
    width: 100%;
  }
  
  .action-buttons-group {
    justify-content: stretch;
  }
  
  .action-btn {
    flex: 1;
  }
  
  .change-values {
    flex-direction: column;
    align-items: stretch;
  }
  
  .value-arrow {
    display: none;
  }
  
  .quantity-change {
    flex-direction: column;
    gap: 1rem;
  }
  
  .quantity-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .metadata-grid {
    grid-template-columns: 1fr;
  }
  
  .details-cell {
    max-width: 200px;
  }
  
  .metadata-text {
    max-width: 150px;
  }
}

@media (max-width: 480px) {
  .header-section {
    padding: 0.75rem;
  }
  
  .toolbar-card,
  .table-card {
    padding: 1rem;
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
  
  .details-cell {
    max-width: 150px;
  }
  
  .metadata-text {
    max-width: 100px;
  }
  
  .change-card {
    padding: 0.75rem;
  }
  
  .value-box {
    min-width: auto;
  }
}
</style>