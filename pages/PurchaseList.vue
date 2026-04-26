<template>
  <div class="purchase-list-view">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">Purchase List</h1>
          <p class="page-subtitle">View purchase recommendations based on inventory and pending requests</p>
        </div>

        <!-- Toolbar -->
        <div class="card toolbar-card">
          <div class="toolbar-content">
            <div class="search-wrapper">
              <IconField class="p-input-icon-left search-input">
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Search by component name, description, location..."
                  class="w-full"
                  @keyup.enter="handleSearch"
                />
              </IconField>
            </div>
            <div class="action-buttons-group">
              <Button 
                label="Search" 
                icon="pi pi-search" 
                @click="handleSearch"
                class="action-btn search-btn"
              />
              <Button 
                label="Refresh" 
                icon="pi pi-refresh" 
                :loading="loading" 
                @click="loadData"
                class="action-btn refresh-btn"
              />
              <Button 
                label="Export CSV"
                icon="pi pi-file-export" 
                @click="exportCSV(filteredPurchaseList, 'purchase_list_export.csv')"
                class="action-btn export-btn primary-gradient"
              />
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="pi pi-box"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalItems }}</div>
              <div class="stat-label">Total Items</div>
            </div>
          </div>
          
          <div class="stat-card urgent">
            <div class="stat-icon">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ urgentPurchaseItems }}</div>
              <div class="stat-label">Urgent Purchase Needed</div>
            </div>
          </div>
          
          <div class="stat-card total">
            <div class="stat-icon">
              <i class="pi pi-shopping-cart"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalNeededToPurchase }}</div>
              <div class="stat-label">Total Needed to Purchase</div>
            </div>
          </div>
        </div>

        <!-- Main Table Card -->
        <div class="card table-card">
          <DataTable
            :value="filteredPurchaseList"
            :loading="loading"
            dataKey="componentId"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} items"
            responsiveLayout="scroll"
            class="custom-table purchase-table"
            sortField="suggestedPurchaseQuantity"
            :sortOrder="-1"
          >
            <!-- Image Column -->
            <Column header="Image" style="width: 100px">
              <template #body="{ data }">
                <div class="image-container">
                  <img
                    v-if="data.link"
                    :src="data.link"
                    :alt="data.model"
                    class="product-image"
                    loading="lazy"
                    @error="handleImageError"
                  />
                  <div v-else class="no-image">
                    <i class="pi pi-image" />
                  </div>
                </div>
              </template>
            </Column>

            <!-- Component Name Column -->
            <Column field="model" header="Component Name" :sortable="true">
              <template #body="{ data }">
                <div class="component-info">
                  <span class="component-name">{{ data.model }}</span>
                  <span class="component-id">{{ data.componentId.slice(-6) }}</span>
                </div>
              </template>
            </Column>

            <!-- Description Column -->
            <Column field="description" header="Description" :sortable="true">
              <template #body="{ data }">
                <span class="description-text" :title="data.description">
                  {{ data.description || '—' }}
                </span>
              </template>
            </Column>

            <!-- Location Column -->
            <Column field="location" header="Location" :sortable="true">
              <template #body="{ data }">
                <Badge 
                  :value="data.location" 
                  severity="secondary"
                  class="location-badge"
                />
              </template>
            </Column>

            <!-- In Stock Column -->
            <Column field="inStock" header="In Stock" :sortable="true">
              <template #body="{ data }">
                <div class="stock-indicator">
                  <Badge 
                    :value="data.inStock" 
                    :severity="getStockSeverity(data.inStock)"
                    class="stock-badge"
                  />
                  <span v-if="data.inStock === 0" class="stock-warning">Out of Stock</span>
                </div>
              </template>
            </Column>

            <!-- Total Requested Column -->
            <Column field="totalRequested" header="Total Requested" :sortable="true">
              <template #body="{ data }">
                <div class="requested-indicator">
                  <Badge 
                    :value="data.totalRequested" 
                    severity="warning"
                    class="requested-badge"
                  />
                </div>
              </template>
            </Column>

            <!-- Suggested Purchase Quantity Column -->
            <Column field="suggestedPurchaseQuantity" header="Suggested Purchase Qty" :sortable="true">
              <template #body="{ data }">
                <div class="purchase-indicator">
                  <Badge 
                    :value="data.suggestedPurchaseQuantity" 
                    :severity="getPurchaseSeverity(data.suggestedPurchaseQuantity)"
                    class="purchase-badge"
                  />
                  <span v-if="data.suggestedPurchaseQuantity > 0" class="purchase-urgent">
                    Need to order
                  </span>
                </div>
              </template>
            </Column>

            <!-- Empty State -->
            <template #empty>
              <div class="empty-state">
                <div class="empty-state-content">
                  <i class="pi pi-shopping-cart empty-icon"></i>
                  <h3>No purchase recommendations</h3>
                  <p>All inventory items have sufficient stock</p>
                </div>
              </div>
            </template>
          </DataTable>
        </div>
      </div>
    </div>
    <Toast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import type { PurchaseItem } from '@/types'

definePageMeta({ 
  middleware: 'auth', 
  requiresAuth: true 
})

const toast = useToast()
const router = useRouter()

// State
const purchaseList = ref<PurchaseItem[]>([])
const loading = ref(false)
const searchQuery = ref('')
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
        detail: 'Technician or admin only', 
        life: 3000 
      })
      router.push('/home')
      return
    }
    
    loadData()
  }
})

// For Nuxt server routes, use relative paths
async function loadData() {
  loading.value = true
  try {
    // Build query parameters
    const queryParams = new URLSearchParams()
    if (searchQuery.value?.trim()) {
      queryParams.append('search', searchQuery.value.trim())
    }
    
    // Use relative path for Nuxt server API
    // This will hit: /api/admin/purchase-list
    const response = await $fetch(`/api/admin/purchase-list${queryParams.toString() ? '?' + queryParams.toString() : ''}`, {
      method: 'GET',
      headers: token.value ? {
        Authorization: `Bearer ${token.value}`
      } : {}
    })
    
    // Handle the response
    const result = response as { 
      success: boolean; 
      data: PurchaseItem[] 
    }
    
    if (result?.success && Array.isArray(result.data)) {
      purchaseList.value = result.data
    } else {
      purchaseList.value = []
    }
  } catch (error: any) {
    console.error('Error loading purchase list:', error)
    
    // Handle unauthorized
    if (error?.status === 401 || error?.statusCode === 401) {
      router.push('/login')
      return
    }
    
    // Show error toast
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error?.data?.message || error?.message || 'Failed to load purchase list', 
      life: 5000 
    })
    
    purchaseList.value = []
  } finally {
    loading.value = false
  }
}

// Computed properties
const totalItems = computed(() => purchaseList.value.length)

const urgentPurchaseItems = computed(() => {
  return purchaseList.value.filter(item => (item.suggestedPurchaseQuantity || 0) > 0).length
})

const totalNeededToPurchase = computed(() => {
  return purchaseList.value.reduce((sum, item) => sum + (item.suggestedPurchaseQuantity || 0), 0)
})

// Filter purchase list based on search
const filteredPurchaseList = computed(() => {
  if (!searchQuery.value.trim()) {
    return purchaseList.value
  }
  
  const searchTerm = searchQuery.value.toLowerCase().trim()
  return purchaseList.value.filter(item => {
    return (
      item.model?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      String(item.location).includes(searchTerm) ||
      item.pendingRequests?.some(req => req.class?.toLowerCase().includes(searchTerm))
    )
  })
})

// Handle search
const handleSearch = () => {
  loadData()
}

// Handle image error
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  img.parentElement?.classList.add('image-error')
}

// Helper functions for severity colors
const getStockSeverity = (stock: number) => {
  const stockNum = parseInt(String(stock)) || 0
  if (stockNum === 0) return 'danger'
  if (stockNum < 5) return 'warning'
  if (stockNum < 10) return 'info'
  return 'success'
}

const getPurchaseSeverity = (needed: number) => {
  const neededNum = parseInt(String(needed)) || 0
  if (neededNum > 5) return 'danger'
  if (neededNum > 0) return 'warning'
  return 'success'
}
</script>

<style scoped>
/* Light mode (default) */
.purchase-list-view {
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

/* Toolbar Card */
.toolbar-card {
  margin-bottom: 2rem;
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  background: var(--surface-0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toolbar-content {
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

.primary-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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

.export-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--surface-0);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  border-left: 4px solid #667eea;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.stat-card.urgent {
  border-left-color: #ef4444;
}

.stat-card.total {
  border-left-color: #10b981;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.stat-card.urgent .stat-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-heading);
  line-height: 1.2;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

/* Table Card */
.table-card {
  padding: 1.5rem;
  border: none;
  border-radius: 16px;
  background: var(--surface-0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  height: 80px;
}

.custom-table :deep(.p-datatable-tbody > tr:hover) {
  background: var(--surface-hover);
}

.custom-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-default);
  vertical-align: middle;
}

/* Image Styles */
.image-container {
  width: 70px;
  height: 70px;
  background: var(--surface-ground);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border-default);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.2s;
}

.product-image:hover {
  transform: scale(1.1);
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted);
  font-size: 2rem;
}

.image-error .no-image {
  display: flex;
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

.component-id {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--surface-overlay);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
}

/* Description Text */
.description-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
  max-width: 300px;
}

/* Badge Styles */
.location-badge :deep(.p-badge) {
  background: var(--surface-card);
  color: var(--text-secondary);
  font-weight: 500;
}

.stock-indicator,
.requested-indicator,
.purchase-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stock-warning {
  font-size: 0.75rem;
  color: var(--p-red-500);
  font-weight: 500;
}

.purchase-urgent {
  font-size: 0.75rem;
  color: var(--p-red-500);
  font-weight: 500;
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
  color: var(--text-primary);
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
  color: var(--text-primary);
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
  background: var(--surface-0);
}

.custom-table :deep(.p-paginator .p-dropdown:hover) {
  border-color: #667eea;
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

/* Loading State */
.custom-table :deep(.p-datatable-loading-overlay) {
  background: var(--surface-overlay);
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

/* Dark mode overrides */
body.p-dark .purchase-list-view {
  background: linear-gradient(135deg, #1e1b2e 0%, #2d1b3a 100%);
}

body.p-dark .main-container {
  background: var(--surface-container);
}

body.p-dark .header-section {
  background: var(--surface-0);
}

body.p-dark .toolbar-card {
  background: var(--surface-0);
}

body.p-dark .stat-card {
  background: var(--surface-0);
}

body.p-dark .table-card {
  background: var(--surface-0);
}

body.p-dark .image-container {
  background: var(--surface-ground);
  border-color: var(--border-default);
}

body.p-dark .component-id {
  background: var(--surface-overlay);
}

body.p-dark .location-badge :deep(.p-badge) {
  background: var(--surface-card);
}

body.p-dark .search-input :deep(.p-inputtext) {
  background: var(--surface-0);
  color: var(--text-primary);
  border-color: var(--border-default);
}

body.p-dark .refresh-btn {
  background: var(--surface-0);
  border-color: var(--border-default);
  color: var(--text-primary);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .description-text {
    max-width: 200px;
  }
}

@media (max-width: 900px) {
  .purchase-list-view {
    padding: 1rem;
  }
  
  .main-container {
    padding: 1rem;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-wrapper {
    min-width: 100%;
  }
  
  .action-buttons-group {
    justify-content: stretch;
  }
  
  .action-btn {
    flex: 1;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .image-container {
    width: 50px;
    height: 50px;
  }
  
  .description-text {
    max-width: 150px;
  }
  
  .stock-indicator,
  .requested-indicator,
  .purchase-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .custom-table :deep(.p-datatable-thead > tr > th) {
    padding: 0.75rem;
    font-size: 0.9rem;
  }
  
  .custom-table :deep(.p-datatable-tbody > tr > td) {
    padding: 0.5rem 0.75rem;
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
  
  .action-buttons-group {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .component-id {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .description-text {
    max-width: 120px;
  }
}
</style>