<template>
  <div class="logs-view">
    <div class="main-container">
      <div class="content-wrapper">
        <div class="header-section">
          <h1 class="page-title">System Logs</h1>
          <p class="page-subtitle">Filterable audit log of system actions</p>
        </div>
        <div class="card toolbar">
          <div class="filter-row">
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText
                v-model="filterUserEmail"
                placeholder="Filter by user email..."
                class="filter-input"
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
            <Button label="Apply" icon="pi pi-filter" @click="loadLogs(1)" />
            <Button label="Refresh" icon="pi pi-refresh" :loading="loading" @click="loadLogs(page)" />
          </div>
        </div>
        <div class="card">
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
            class="p-datatable-sm"
          >
            <Column field="action" header="Action">
              <template #body="{ data }">
                <Tag :value="formatAction(data.action)" :severity="actionSeverity(data.action)" />
              </template>
            </Column>
            <Column field="userEmail" header="Actor" />
            <Column field="userRole" header="Role" />
            <Column field="timestamp" header="Timestamp">
              <template #body="{ data }">
                {{ formatDate(data.timestamp) }}
              </template>
            </Column>
            <Column header="Details">
              <template #body="{ data }">
                <div class="details-cell">
                  <span class="metadata-text">{{ metadataSummary(data) }}</span>
                  <Button 
                    icon="pi pi-eye" 
                    class="p-button-rounded p-button-text p-button-sm details-button"
                    @click="showDetails(data)"
                    :disabled="!hasDetails(data)"
                    v-tooltip.top="'View details'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>

    <!-- Details Dialog -->
    <Dialog 
      v-model:visible="detailsDialogVisible" 
      :header="dialogTitle" 
      :style="{ width: '700px' }" 
      class="p-fluid details-dialog"
      :modal="true"
      :dismissableMask="true"
    >
      <div v-if="selectedLog" class="dialog-content">
        <!-- Metadata Section -->
        <div class="metadata-section">
          <div class="metadata-row">
            <span class="label">Action:</span>
            <Tag :value="formatAction(selectedLog.action)" :severity="actionSeverity(selectedLog.action)" />
          </div>
          <div class="metadata-row">
            <span class="label">Actor:</span>
            <span>{{ selectedLog.userEmail }} ({{ selectedLog.userRole }})</span>
          </div>
          <div class="metadata-row">
            <span class="label">Timestamp:</span>
            <span>{{ formatDate(selectedLog.timestamp) }}</span>
          </div>
          <div class="metadata-row">
            <span class="label">IP Address:</span>
            <span>{{ selectedLog.ip || 'N/A' }}</span>
          </div>
          <div class="metadata-row">
            <span class="label">User Agent:</span>
            <span class="user-agent">{{ selectedLog.userAgent || 'N/A' }}</span>
          </div>
          <div v-if="selectedLog.metadata?.entityId" class="metadata-row">
            <span class="label">Entity ID:</span>
            <span class="entity-id">{{ formatObjectId(selectedLog.metadata.entityId) }}</span>
          </div>
          <div v-if="selectedLog.metadata?.entityType" class="metadata-row">
            <span class="label">Entity Type:</span>
            <span>{{ selectedLog.metadata.entityType }}</span>
          </div>
        </div>

        <Divider />

        <!-- UPDATE Action - Show Changes -->
        <div v-if="isUpdateAction(selectedLog.action)" class="changes-section">
          <h3>Changes Made</h3>
          
          <!-- Component Details -->
          <div v-if="selectedLog.metadata?.componentDetails" class="component-details">
            <h4>Component</h4>
            <div class="details-grid">
              <div v-if="selectedLog.metadata.componentDetails.model" class="detail-item">
                <span class="label">Model:</span>
                <span>{{ selectedLog.metadata.componentDetails.model }}</span>
              </div>
              <div v-if="selectedLog.metadata.componentDetails.description" class="detail-item">
                <span class="label">Description:</span>
                <span>{{ selectedLog.metadata.componentDetails.description }}</span>
              </div>
            </div>
          </div>

          <!-- Changes List -->
          <div v-if="selectedLog.metadata?.changes" class="changes-list">
            <h4>Fields Updated</h4>
            <div v-for="(change, index) in selectedLog.metadata.changes" :key="index" class="change-item">
              <div class="change-field">
                <Chip :label="change.field" class="field-chip" />
              </div>
              <div class="change-values">
                <div class="old-value">
                  <span class="value-label">Old:</span>
                  <span class="value">{{ formatValue(change.oldValue) }}</span>
                </div>
                <div class="new-value">
                  <span class="value-label">New:</span>
                  <span class="value">{{ formatValue(change.newValue) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary Cards (alternative view) -->
          <div v-else-if="selectedLog.metadata?.before || selectedLog.metadata?.after" class="state-comparison">
            <div v-if="selectedLog.metadata.before" class="state-card before">
              <h4>Before</h4>
              <pre>{{ formatJSON(selectedLog.metadata.before) }}</pre>
            </div>
            <div v-if="selectedLog.metadata.after" class="state-card after">
              <h4>After</h4>
              <pre>{{ formatJSON(selectedLog.metadata.after) }}</pre>
            </div>
          </div>

          <!-- Quantity Change Highlight -->
          <div v-if="selectedLog.metadata?.quantity" class="quantity-highlight">
            <h4>Quantity Update</h4>
            <div class="quantity-change">
              <span class="old-qty">{{ selectedLog.metadata.quantity.previous }}</span>
              <i class="pi pi-arrow-right" />
              <span class="new-qty">{{ selectedLog.metadata.quantity.new }}</span>

            </div>
          </div>
        </div>

        <!-- CREATE Action -->
        <div v-else-if="isCreateAction(selectedLog.action)" class="create-section">
          <h3>Created {{ selectedLog.metadata?.entityType || 'Item' }}</h3>
          
          <!-- Component Details -->
          <div v-if="selectedLog.metadata?.componentDetails" class="component-details">
            <div class="details-grid">
              <div v-if="selectedLog.metadata.componentDetails.model" class="detail-item">
                <span class="label">Model:</span>
                <span>{{ selectedLog.metadata.componentDetails.model }}</span>
              </div>
              <div v-if="selectedLog.metadata.componentDetails.description" class="detail-item">
                <span class="label">Description:</span>
                <span>{{ selectedLog.metadata.componentDetails.description }}</span>
              </div>
            </div>
          </div>

          <!-- Created Data -->
          <div class="state-card after">
            <h4>New Values</h4>
            <pre>{{ formatJSON(selectedLog.metadata.after || selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- DELETE Action -->
        <div v-else-if="isDeleteAction(selectedLog.action)" class="delete-section">
          <h3>Deleted {{ selectedLog.metadata?.entityType || 'Item' }}</h3>
          
          <!-- Component Details -->
          <div v-if="selectedLog.metadata?.componentDetails" class="component-details">
            <div class="details-grid">
              <div v-if="selectedLog.metadata.componentDetails.model" class="detail-item">
                <span class="label">Model:</span>
                <span>{{ selectedLog.metadata.componentDetails.model }}</span>
              </div>
              <div v-if="selectedLog.metadata.componentDetails.description" class="detail-item">
                <span class="label">Description:</span>
                <span>{{ selectedLog.metadata.componentDetails.description }}</span>
              </div>
            </div>
          </div>

          <!-- Deleted Data -->
          <div class="state-card before">
            <h4>Deleted Values</h4>
            <pre>{{ formatJSON(selectedLog.metadata.before || selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- REQUEST Actions -->
        <div v-else-if="isRequestAction(selectedLog.action)" class="request-section">
          <h3>Request {{ getRequestAction(selectedLog.action) }}</h3>
          <div class="state-card">
            <pre>{{ formatJSON(selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- Default View -->
        <div v-else class="default-section">
          <h3>Details</h3>
          <div class="state-card">
            <pre>{{ formatJSON(selectedLog.metadata) }}</pre>
          </div>
        </div>

        <!-- Reason -->
        <div v-if="selectedLog.metadata?.reason" class="reason-section">
          <h4>Reason</h4>
          <p>{{ selectedLog.metadata.reason }}</p>
        </div>
      </div>

      <template #footer>
        <Button label="Close" icon="pi pi-times" @click="detailsDialogVisible = false" class="p-button-text" />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
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
const logs = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const filterUserEmail = ref('')
const filterAction = ref<string | null>(null)
const pagination = reactive({ page: 1, limit: 50, total: 0, pages: 0 })

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

const token = ref('')
onMounted(() => {
  token.value = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : ''
  const user = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
  if (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'instructor') {
    toast.add({ severity: 'error', summary: 'Access denied', detail: 'Technician or admin only', life: 3000 })
    router.push('/home')
    return
  }
  loadLogs(1)
})

function getHeaders () {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {}
}

async function loadLogs (pageNum: number) {
  page.value = pageNum
  loading.value = true
  try {
    const query: Record<string, string> = {
      page: String(pageNum),
      limit: String(pagination.limit),
    }
    if (filterUserEmail.value?.trim()) query.userEmail = filterUserEmail.value.trim()
    if (filterAction.value) query.action = filterAction.value
    const res = await $fetch<{ success: boolean; data: any[]; pagination: any }>(apiUrl('admin/logs'), {
      query,
      headers: getHeaders() as Record<string, string>,
    })
    if (res?.success && Array.isArray(res.data)) {
      logs.value = res.data
      if (res.pagination) {
        pagination.page = res.pagination.page
        pagination.limit = res.pagination.limit
        pagination.total = res.pagination.total
        pagination.pages = res.pagination.pages
      }
    }
  } catch (e: any) {
    if (e?.statusCode === 401) {
      router.push('/login')
      return
    }
    toast.add({ severity: 'error', summary: 'Error', detail: e?.data?.message || 'Failed to load logs', life: 5000 })
  } finally {
    loading.value = false
  }
}

function onPage (event: any) {
  if (event.rows != null && event.rows !== pagination.limit) {
    pagination.limit = event.rows
    page.value = 1
  } else {
    page.value = (event.page ?? 0) + 1
  }
  loadLogs(page.value)
}

function formatDate (d: string | Date | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString()
}

function formatAction (action: string) {
  return action.replace(/_/g, ' ')
}

function actionSeverity (action: string) {
  if (action?.includes('APPROVE') || action?.includes('RETURN')) return 'success'
  if (action?.includes('DECLINE') || action?.includes('DELETE')) return 'danger'
  if (action?.includes('CREATE')) return 'info'
  if (action?.includes('UPDATE')) return 'warning'
  return 'info'
}

// Action type checkers
function isUpdateAction (action: string) {
  return action?.includes('UPDATE')
}

function isCreateAction (action: string) {
  return action?.includes('CREATE')
}

function isDeleteAction (action: string) {
  return action?.includes('DELETE')
}

function isRequestAction (action: string) {
  return action?.includes('REQUEST')
}

function getRequestAction (action: string) {
  return action.replace('REQUEST_', '').toLowerCase()
}

function formatObjectId (objId: any) {
  if (!objId) return 'N/A'
  if (typeof objId === 'string') return objId
  if (objId.$oid) return objId.$oid
  return String(objId)
}

function formatValue (value: any) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function metadataSummary (log: any) {
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

function hasDetails (log: any) {
  return log?.metadata && Object.keys(log.metadata).length > 0
}

function showDetails (log: any) {
  selectedLog.value = log
  detailsDialogVisible.value = true
}

function formatJSON (obj: any) {
  if (!obj) return '{}'
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>

<style scoped>
.logs-view { min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); }
.main-container { padding: 1.5rem; }
.content-wrapper { max-width: 1400px; margin: 0 auto; }
.header-section { margin-bottom: 1rem; }
.page-title { font-size: 1.75rem; font-weight: 700; color: #111; margin: 0 0 0.25rem 0; }
.page-subtitle { color: #666; margin: 0; }
.toolbar { margin-bottom: 1rem; }
.filter-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.filter-input { width: 220px; }
.filter-select { width: 180px; }
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
  opacity: 0.7;
  transition: opacity 0.2s;
}
.details-button:hover {
  opacity: 1;
}
.details-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.card { padding: 1rem; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

/* Dialog Styles */
.details-dialog :deep(.p-dialog-content) {
  padding: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metadata-section {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metadata-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.metadata-row .label {
  font-weight: 600;
  min-width: 100px;
  color: #666;
}

.metadata-row .user-agent {
  font-size: 0.85rem;
  color: #666;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metadata-row .entity-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #666;
}

.changes-section, .create-section, .delete-section, .request-section, .default-section, .reason-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.changes-section h3, .create-section h3, .delete-section h3, .request-section h3, .default-section h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.reason-section h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
}

.component-details {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item .label {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span:not(.label) {
  font-weight: 500;
  color: #333;
}

.state-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.state-card.before {
  border-left-color: #ff9800;
}

.state-card.after {
  border-left-color: #4caf50;
}

.state-card h4 {
  margin: 0 0 0.75rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.state-card pre {
  margin: 0;
  font-size: 0.85rem;
  background: #fff;
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.state-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #2196f3;
}

.change-field {
  min-width: 100px;
}

.field-chip {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.change-values {
  flex: 1;
  display: flex;
  gap: 2rem;
}

.old-value, .new-value {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.value-label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  font-weight: 500;
  font-family: monospace;
  background: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.old-value .value {
  color: #f57c00;
}

.new-value .value {
  color: #388e3c;
}

.quantity-highlight {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.quantity-change {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.2rem;
  margin-top: 0.5rem;
}

.old-qty, .new-qty {
  font-weight: 700;
  font-size: 1.5rem;
}

.old-qty {
  color: #f57c00;
}

.new-qty {
  color: #388e3c;
}

.change-tag {
  font-size: 0.9rem;
}

.reason-section p {
  background: #fff3e0;
  padding: 0.75rem;
  border-radius: 4px;
  margin: 0;
  color: #e65100;
}

.divider {
  margin: 0.5rem 0;
}

@media (max-width: 768px) {
  .state-comparison {
    grid-template-columns: 1fr;
  }
  
  .change-item {
    flex-direction: column;
  }
  
  .change-values {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>