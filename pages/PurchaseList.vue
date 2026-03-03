<template>
  <div class="purchase-list-view">
    
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <div>
            <h1 class="text-3xl font-bold text-surface-900">
              Purchase List Management
            </h1>
            <br />
            <p class="text-surface-600 mt-2">
              View purchase recommendations based on inventory and pending requests
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
                @click="exportCSV(filteredPurchaseList, 'purchase_list_export.csv')"
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
                :value="filteredPurchaseList"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                :loading="loading"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} items"
                responsiveLayout="scroll"
                class="p-datatable-sm"
                sortField="suggestedPurchaseQuantity"
                :sortOrder="-1"
              >
                <!-- Component Name Column -->
                <Column field="model" header="Component Name" :sortable="true" />

                <!-- In Stock Column -->
                <Column field="inStock" header="In Stock" :sortable="true">
                  <template #body="{ data }">
                    <Badge 
                      :value="data.inStock" 
                      :severity="getStockSeverity(data.inStock)"
                    />
                  </template>
                </Column>

                <!-- Total Requested Column -->
                <Column field="totalRequested" header="Total Requested" :sortable="true">
                  <template #body="{ data }">
                    <Badge 
                      :value="data.totalRequested" 
                      severity="warning"
                    />
                  </template>
                </Column>

                <!-- Suggested Purchase Quantity Column -->
                <Column field="suggestedPurchaseQuantity" header="Suggested Purchase Qty" :sortable="true">
                  <template #body="{ data }">
                    <Badge 
                      :value="data.suggestedPurchaseQuantity" 
                      :severity="getPurchaseSeverity(data.suggestedPurchaseQuantity)"
                    />
                  </template>
                </Column>
              </DataTable>
            </div>

            <!-- Stats Cards -->
            <br>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div class="card text-center p-6">
                <div class="text-3xl font-bold text-primary-600">{{ totalItems }}</div>
                <div class="text-surface-600 mt-2">Total Items</div>
              </div>
              <br>
              <div class="card text-center p-6">
                <div class="text-3xl font-bold text-red-600">{{ urgentPurchaseItems }}</div>
                <div class="text-surface-600 mt-2">Urgent Purchase Needed</div>
              </div>
              <br>
              <div class="card text-center p-6">
                <div class="text-3xl font-bold text-green-600">{{ totalNeededToPurchase }}</div>
                <div class="text-surface-600 mt-2">Total Needed to Purchase</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Navbar from '@/components/Navbar.vue'
import { exportCSV } from '@/utils/exportCSV.js'

const router = useRouter()
const toast = useToast()
// Remove the useRuntimeConfig as it might not be available
// const config = useRuntimeConfig()
// const apiBase = computed(() => (config.public?.API_URL || '').replace(/\/$/, '') || '')
const apiBase = '' // Set this based on your environment
const apiUrl = (path) => apiBase ? `${apiBase}/${path}` : `/api/${path}`

// State
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const purchaseList = ref([])
const loading = ref(false)
const searchQuery = ref('')

onMounted(() => {
  checkAdminAccess()
  loadData()
})

function checkAdminAccess () {
  const userRole = user.value?.role
  if (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'instructor') {
    toast.add({
      severity: 'error',
      summary: 'Access Denied',
      detail: 'Only technicians or administrators can access this page',
      life: 3000
    })
    router.push('/home')
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
    return Object.values(item).some(value => {
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(searchTerm)
    })
  })
})

const loadData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    
    // Remove the TypeScript generic syntax
    const res = await $fetch(apiUrl('admin/purchase-list'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    if (res?.success && Array.isArray(res.data)) {
      purchaseList.value = res.data
      toast.add({
        severity: 'success',
        summary: 'Data Loaded',
        detail: `Loaded ${res.data.length} items`,
        life: 3000
      })
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    // Check for 401
    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error?.data?.message || error?.message || 'Failed to load purchase list',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Handle search
const handleSearch = () => {
  // Optional: Add debounce here if needed
}

// Helper functions for severity colors
const getStockSeverity = (stock) => {
  const stockNum = parseInt(stock) || 0
  if (stockNum === 0) return 'danger'
  if (stockNum < 5) return 'warning'
  if (stockNum < 10) return 'info'
  return 'success'
}

const getPurchaseSeverity = (needed) => {
  const neededNum = parseInt(needed) || 0
  if (neededNum > 0) return 'danger'
  return 'success'
}

</script>

<style scoped>
.purchase-list-view {
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

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.grid {
  display: grid;
}

.ml-4 {
  margin-left: 1rem;
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
  
  .grid {
    grid-template-columns: 1fr;
  }
  .card.mb-6 {
    margin-bottom: 1rem !important; 
  }
}
</style>