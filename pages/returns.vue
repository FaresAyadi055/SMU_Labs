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
              <span class="p-input-icon-left search-input">
                <i class="pi pi-search" />
                <InputText
                  v-model="search"
                  placeholder="Search by student email or component..."
                  class="w-full"
                  @keyup.enter="loadActiveLoans"
                />
              </span>
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

        <!-- Loans Table -->
        <div class="card table-card">
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
            class="custom-table"
          >
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

            <Column header="Action" style="width: 160px">
              <template #body="{ data }">
                <Button
                  label="Mark returned"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  :loading="returningId === data.id"
                  @click="markReturned(data)"
                  class="return-button"
                />
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
const loading = ref(false)
const returningId = ref<string | null>(null)

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
    
    loadActiveLoans()
  }
})

// For Nuxt server routes, use relative paths
async function loadActiveLoans() {
  loading.value = true
  try {
    // Build query parameters
    const queryParams = new URLSearchParams()
    if (search.value?.trim()) {
      queryParams.append('search', search.value.trim())
    }
    
    // Use relative path for Nuxt server API
    // This will hit: /api/admin/active-loans
    const response = await $fetch(`/api/admin/active-loans${queryParams.toString() ? '?' + queryParams.toString() : ''}`, {
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
      loans.value = result.data
    } else {
      loans.value = []
    }
  } catch (error: any) {
    console.error('Error loading active loans:', error)
    
    // Handle unauthorized
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

const filteredLoans = computed(() => loans.value)

function formatDate(d: string | null) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function handleImageError(event: Event) {
  (event.target as HTMLImageElement).style.display = 'none'
}

async function markReturned(row: any) {
  returningId.value = row.id
  try {
    await $fetch('/api/admin/return-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
      },
      body: { requestId: row.id },
    })
    
    toast.add({ 
      severity: 'success', 
      summary: 'Returned', 
      detail: `${row.component?.model ?? 'Item'} marked as returned`, 
      life: 3000 
    })
    
    loans.value = loans.value.filter((l) => l.id !== row.id)
  } catch (error: any) {
    console.error('Error marking as returned:', error)
    
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error?.data?.message || error?.message || 'Failed to mark as returned', 
      life: 5000 
    })
  } finally {
    returningId.value = null
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
  border: 1px solid #e5e7eb;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  transition: all 0.2s;
}

.search-input :deep(.p-inputtext:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.search-input :deep(.pi-search) {
  left: 1rem;
  color: #999;
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
.custom-table :deep(.p-datatable-header) {
  background: transparent;
  border: none;
  padding: 0 0 1rem 0;
}

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
  color: #333;
}

.component-manufacturer {
  font-size: 0.8rem;
  color: #999;
}

/* Image Styles */
.image-container {
  width: 48px;
  height: 48px;
  background: #f8f9fa;
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
  color: #999;
  font-size: 1.2rem;
}

/* Location Badge */
.location-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

.location-badge :deep(.p-badge) {
  background: #f1f5f9;
  color: #64748b;
}

/* Quantity Badge */
.quantity-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  min-width: 60px;
}

/* Class Tag */
.class-tag {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

/* Date Info */
.date-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
}

.date-info i {
  color: #667eea;
  font-size: 0.9rem;
}

/* Return Button */
.return-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  padding: 0.5rem 1rem;
  font-weight: 600;
  transition: all 0.2s;
  width: 100%;
}

.return-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.return-button:disabled {
  opacity: 0.6;
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
  border-color: #e5e7eb;
}

.custom-table :deep(.p-paginator .p-dropdown:hover) {
  border-color: #667eea;
}

.custom-table :deep(.p-paginator .p-dropdown .p-dropdown-label) {
  padding: 0.5rem 1rem;
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
  
  .search-wrapper {
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
  
  .return-button {
    padding: 0.5rem;
    font-size: 0.85rem;
  }
  
  .return-button .p-button-label {
    display: none;
  }
  
  .return-button .p-button-icon {
    margin: 0;
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
  
  .toolbar-card {
    padding: 1rem;
  }
  
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
}

/* PrimeVue Overrides */
.custom-table :deep(.p-datatable-wrapper) {
  border-radius: 8px;
}

.custom-table :deep(.p-tag) {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.custom-table :deep(.p-badge) {
  background: #f1f5f9;
  color: #64748b;
  font-weight: 500;
}

.custom-table :deep(.p-button.p-button-success) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

.custom-table :deep(.p-button.p-button-success:hover) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

/* Scrollbar Styling */
.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.custom-table :deep(.p-datatable-wrapper)::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>