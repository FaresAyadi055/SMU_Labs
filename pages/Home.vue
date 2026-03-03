<!-- pages/inventory/index.vue -->
<template>
  <div class="home">
    <!-- Navbar will be handled by layout instead -->
    
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <div>
            <h1 class="text-3xl font-bold text-surface-900">
              {{ userRole === 'admin' ? 'Inventory Management' : 'Inventory Catalog' }}
            </h1>
            <br />
            <p class="text-surface-600 mt-2">
              {{ userRole === 'admin' ? 'Manage all inventory items' : 'Browse and request for components' }}
            </p>
          </div>
          <br />
          <div class="flex items-center gap-4">
          </div>
        </div>

        <!-- Search and Actions -->
        <div class="card mb-6">
          <div class="flex justify-between items-left p-4">
            <!-- Search -->
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
            <br/>
            <!-- Action Buttons -->
            <div class="flex items-center gap-2">
              <Button 
                label="Refresh" 
                icon="pi pi-refresh" 
                @click="loadData"
                :loading="loading"
                severity="secondary"
              /> <span>   </span>
              <Button v-if="false"
                label="Request Unavailable Item" 
                icon="pi pi-exclamation-circle" 
                @click="showMissingDialog = true" 
                v-tooltip="'Request unavailable item'"
                severity="info"
              /> <span>  </span>
              <Button 
                v-if="userRole === 'admin'"   
                label="Add Item" 
                icon="pi pi-plus" 
                @click="showAddDialog = true" 
                severity="primary"  
              /> <span>  </span>
              <!-- Export CSV Button only for admin -->
              <Button 
                v-if="userRole === 'admin'"   
                label="Export CSV"
                icon="pi pi-file-export" 
                @click="exportCSV(filteredItems, 'inventory_export.csv')"
                severity="primary"
              />
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content-area">
          <!-- Product Grid Section -->
          <div class="table-section">
            <!-- Product Grid View -->
            <div v-if="!loading && paginatedItems.length > 0" class="product-grid">
              <div 
                v-for="item in paginatedItems" 
                :key="item.id"
                class="product-card"
                :class="{ 
                  'selected': selectedItems?.id === item.id,
                  'expanded': expandedItemId === item.id
                }"
                @click="toggleItemExpansion(item)"
              >
                <!-- Product Image -->
                <div class="product-image-container">
                  <img 
                    :src="item.link || '/placeholder-image.png'" 
                    :alt="item.model || item.name"
                    class="product-image"
                    @error="handleImageError"
                  />
                  <!-- Stock Badge -->
                  <div class="stock-badge" :class="getStockClass(item.quantity)">
                    {{ getStockText(item.quantity) }}
                  </div>
                </div>

                <!-- Product Info -->
                <div class="product-info">
                  <h3 class="product-title">{{ item.model || item.name }}</h3>
                  <p class="product-description" :title="item.description">
                    {{ truncateDescription(item.description) }}
                  </p>
                  
                  <!-- Product Details -->
                  <div class="product-details">
                    <div class="detail-item">
                      <i class="pi pi-box text-surface-400"></i>
                      <span>{{ item.quantity }} in stock</span>
                    </div>
                    <div v-if="item.location" class="detail-item">
                      <i class="pi pi-map-marker text-surface-400"></i>
                      <span>{{ item.location }}</span>
                    </div>
                    <div v-if="item.category" class="detail-item">
                      <i class="pi pi-tag text-surface-400"></i>
                      <span>{{ item.category }}</span>
                    </div>
                  </div>

                  <!-- Expanded Content -->
                  <div v-if="expandedItemId === item.id" class="expanded-content">
                    <!-- Admin Actions -->
                    <div v-if="userRole === 'admin'" class="admin-actions">
                      <div class="action-grid">
                        <Button 
                          label="Edit" 
                          icon="pi pi-pencil" 
                          class="action-button"
                          @click.stop="openUpdateDialog(item)"
                          severity="secondary"
                          size="small"
                        />
                        <Button 
                          label="Delete" 
                          icon="pi pi-trash" 
                          class="action-button"
                          @click.stop="deleteSelectedItem(item)"
                          severity="danger"
                          size="small"
                        />
                        <Button 
                          label="Request" 
                          icon="pi pi-shopping-cart" 
                          class="action-button"
                          @click.stop="openRequestDialog(item)"
                          severity="success"
                          size="small"
                        />
                      </div>
                    </div>
                    
                    <!-- Student Actions -->
                    <div v-if="userRole === 'student'" class="student-actions">
                      <Button 
                        label="Request Item" 
                        icon="pi pi-shopping-cart" 
                        class="request-button"
                        @click.stop="openRequestDialog(item)"
                        severity='success'
                        size="small"
                      />
                    </div>
                    
                    <!-- Additional Item Details -->
                    <div class="additional-details">
                      <div v-if="item.created_at" class="detail-row">
                        <span class="detail-label">Added:</span>
                        <span class="detail-value">{{ formatDate(item.created_at) }}</span>
                      </div>
                      <div v-if="item.link" class="detail-row">
                        <span class="detail-label">Image Link:</span>
                        <a :href="item.link" target="_blank" class="detail-link">View Image</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="!loading && filteredItems.length === 0" class="empty-state">
              <i class="pi pi-box" style="font-size: 4rem; color: #e0e0e0;"></i>
              <h3>No items found</h3>
              <p v-if="searchQuery">Try adjusting your search query</p>
              <p v-else>Inventory is currently empty</p>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
              <ProgressSpinner style="width: 50px; height: 50px" />
              <p>Loading inventory...</p>
            </div>

            <!-- Pagination -->
            <div v-if="!loading && filteredItems.length > 0" class="pagination-container">
              <div class="pagination-info">
                Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ filteredItems.length }} items
              </div>
              <div class="pagination-controls">
                <Button 
                  icon="pi pi-chevron-left" 
                  @click="prevPage"
                  :disabled="currentPage === 1"
                  class="p-button-rounded p-button-text"
                />
                <div class="page-numbers">
                  <span 
                    v-for="page in visiblePages" 
                    :key="page"
                    class="page-number"
                    :class="{ 'active': page === currentPage, 'ellipsis': page === '...' }"
                    @click="page !== '...' ? goToPage(page) : null"
                  >
                    {{ page }}
                  </span>
                </div>
                <Button 
                  icon="pi pi-chevron-right" 
                  @click="nextPage"
                  :disabled="currentPage === totalPages"
                  class="p-button-rounded p-button-text"
                />
              </div>
              <div class="items-per-page">
                <span>Items per page:</span>
                <Select 
                  v-model="itemsPerPage"
                  :options="itemsPerPageOptions"
                  @change="currentPage = 1"
                  class="page-select"
                />
              </div>
            </div>

            <!-- Stats Summary Container -->
            <div v-if="userRole === 'admin' && filteredItems.length > 0" class="summary-container card mt-8">
              <div class="summary-header">
                <h3 class="text-lg font-semibold text-surface-900">Inventory Summary</h3>
              </div>
              <div class="summary-stats">
                <div class="stat-item">
                  <div class="stat-value text-primary-600">{{ totalItems }}</div>
                  <div class="stat-label">Total Items</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-yellow-600">{{ lowStockItems }}</div>
                  <div class="stat-label">Low Stock</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-red-600">{{ outOfStockItems }}</div>
                  <div class="stat-label">Out of Stock</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-green-600">{{ inStockItems }}</div>
                  <div class="stat-label">In Stock</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Update Item Dialog -->
    <Dialog 
      v-if="userRole === 'admin'"
      v-model:visible="showUpdateDialog" 
      :style="{ width: '500px' }" 
      header="Update Item"
      :modal="true"
    >
      <div class="p-fluid">
        <div class="field">
          <label for="updateModel">Model </label>
          <InputText 
            id="updateModel"
            v-model="selectedItems.model"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field">
          <label for="updateDescription">Description </label>
          <InputText 
            id="updateDescription"
            v-model="selectedItems.description"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field">
          <label for="updateLink">Image URL </label>
          <InputText 
            id="updateLink"
            v-model="selectedItems.link"
            class="mt-2"
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <br/>
        <div class="field">
          <label for="updateQuantity">Quantity </label>
          <InputNumber 
            id="updateQuantity"
            v-model="selectedItems.quantity"
            :min="0"
            showButtons
            class="mt-2 w-full"
          />
        </div>
        <br/>
        <div class="field">
          <label for="updateLocation">Location </label>
          <InputText 
            id="updateLocation"
            v-model="selectedItems.location"
            class="mt-2"
          />
        </div>
        <br/>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showUpdateDialog = false" 
          class="p-button-text"
          severity="danger"
        />
        <Button 
          label="Update" 
          icon="pi pi-check" 
          @click="updateSelectedItem"
          autofocus
          :loading="updatingItem"
        />
      </template>
    </Dialog>

    <!-- Request Item Dialog -->
    <Dialog 
      v-model:visible="showRequestDialog" 
      :style="{ width: '450px' }" 
      header="Request Item"
      :modal="true"
    >
      <div class="p-fluid">
        <!-- Item Preview -->
        <div v-if="selectedItems" class="request-item-preview mb-4">
          <img 
            :src="selectedItems.link || '/placeholder-image.png'" 
            :alt="selectedItems.model"
            class="request-item-image"
          />
          <div class="request-item-info">
            <h4>{{ selectedItems.model || selectedItems.name }}</h4>
            <div class="flex items-center gap-2">
              <Badge 
                :value="selectedItems.quantity" 
                :severity="getQuantitySeverity(selectedItems.quantity)"
              />
              <span class="text-sm text-surface-600"> available</span>
            </div>
          </div>
        </div>

        <div class="field">
          <label for="quantity">Quantity </label>
          <InputNumber 
            id="quantity"
            v-model="requestForm.quantity"
            :min="1"
            showButtons
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field mt-4">
          <label for="class">Class</label>
          <div class="flex gap-2 mt-2">
            <Select 
              v-model="requestForm.class_prefix"
              :options="classPrefixes"
              placeholder="Cohort"
              class="flex-1"
            />
            <Select 
              v-model="requestForm.class_number"
              :options="classNumbers"
              placeholder="Group"
              class="flex-1"
            />
          </div>
        </div>
        <br/>
        <div class="field mt-4">
          <label for="studentEmail">Student Email</label>
          <InputText 
            id="studentEmail"
            v-model="requestForm.student_email"
            :placeholder="userEmail"
            readonly
            class="mt-2"
          />
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showRequestDialog = false" 
          class="p-button-text"
          severity="danger"
        />
        <Button 
          label="Submit Request" 
          icon="pi pi-check" 
          @click="submitRequest" 
          autofocus
          :loading="submittingRequest"
        />
      </template>
    </Dialog>

    <!-- Confirmation Dialog Component -->
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

    <!-- Request unavailable Item Dialog -->
    <Dialog 
      v-model:visible="showMissingDialog" 
      :style="{ width: '600px' }" 
      header="Request an Unavailable Item"
      :modal="true"
    >
      <div class="flex flex-wrap gap-4 p-fluid">
        <div>
          <a class="supplier" href="https://tuni-smart-innovation.com/" target="_blank" rel="noopener noreferrer">Tunisia Smart Innovation</a>
        </div>
          <br/>
        <p class="instruction">This is a link to our supplier website, if you find the item you need, please copy the link to the item and paste it.</p>
        <br/>
        
        <div class="flex-order-1 w-full">
          <label for="modelName" class="font-bold block mb-2">Model Name </label>
          <InputText 
            id="modelName"
            v-model="missingrequestForm.model"
            placeholder="e.g. Raspberry Pi 4"
          />
        </div>
        <br/>
        <div class="flex-order-2 w-full">
          <label for="description" class="font-bold block mb-2">Product Link </label>
          <InputText 
            id="description"
            v-model="missingrequestForm.description"
            placeholder="Paste product link here"
          />
        </div>
        <br/>
        <div class="flex-1 min-w-[200px]">
          <label for="quantity" class="font-bold block mb-2">Quantity </label>
          <InputNumber 
            id="quantity"
            v-model="missingrequestForm.quantity"
            :min="1"
            showButtons
          />
        </div>
        <br/>
        <div class="flex-1 min-w-[200px]">
          <label for="studentEmail" class="font-bold block mb-2">Student Email </label>
          <InputText 
            id="studentEmail"
            v-model="missingrequestForm.student_email"
            :placeholder="userEmail"
            readonly
          />
        </div>
        <br/>
        <div class="w-full">
          <label class="font-bold block mb-2">Class</label>
          <div class="flex gap-2">
            <br/>
            <Select 
              v-model="missingrequestForm.class_prefix"
              :options="classPrefixes"
              placeholder="Cohort"
              class="flex-1"
            />
            <Select 
              v-model="missingrequestForm.class_number"
              :options="classNumbers"
              placeholder="Group"
              class="flex-1"
            />
          </div>
        </div>
        <br/>
        <p class = "warning">Please do not request an item that is already on the inventory list even if it's out of stock, and do not request an item that is not listed on the supplier website.</p>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="showMissingDialog = false" class="p-button-text" severity="danger"/>
        <Button 
          label="Submit Request" 
          icon="pi pi-check" 
          @click="submitMissing" 
          :loading="submittingMissingRequest"
        />
      </template>
    </Dialog>

    <!-- Add Item Dialog (Admin only) -->
    <Dialog 
      v-if="userRole === 'admin'"
      v-model:visible="showAddDialog" 
      :style="{ width: '500px' }" 
      header="Add New Item"
      :modal="true"
    >
      <div class="p-fluid">
        <div class="field">
          <label for="itemName">Model Name </label>
          <InputText id="itemName" v-model="newItem.model" class="mt-2" />
        </div>
        <br/>
        <div class="field">
          <label for="itemDescription">Description </label>
          <InputText id="itemDescription" v-model="newItem.description" class="mt-2" />
        </div>
        <br/>
        <div class="field mt-4">
          <label for="itemLink">Image URL </label>
          <InputText 
            id="itemLink"
            v-model="newItem.link"
            class="mt-2"
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <br/>
        <div class="field mt-4">
          <label for="itemQuantity">Quantity </label>
          <InputNumber 
            id="itemQuantity"
            v-model="newItem.quantity"
            :min="0"
            class="mt-2"
          />
        </div>
        <br/>
        <div class="field mt-4">
          <label for="itemLocation">Location </label>
          <InputText id="itemLocation" v-model="newItem.location" class="mt-2" />
        </div>
        <br/>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showAddDialog = false; resetNewItemForm()"  
          class="p-button-text"
          severity="danger"
        />
        <Button 
          label="Add Item" 
          icon="pi pi-check" 
          @click="addNewItem" 
          autofocus
          :loading="addingItem"
        />
      </template>
    </Dialog>

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast'
import { exportCSV } from '~/utils/exportCSV.js' 

// Nuxt 3 uses #build/imports for auto-imported composables
// useRouter is auto-imported in Nuxt 3
const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()
const apiUrl = config.public.API_URL || 'http://localhost:4000/api'

// State
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const inventoryItems = ref([])
const loading = ref(false)
const selectedItems = ref(null)
const searchQuery = ref('')
const expandedItemId = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const itemsPerPageOptions = ref([5, 10, 15, 30, 50, 100])

// Dialog states
const showRequestDialog = ref(false)
const showAddDialog = ref(false)
const submittingRequest = ref(false)
const addingItem = ref(false)
const showMissingDialog = ref(false)
const submittingMissingRequest = ref(false)
const showUpdateDialog = ref(false)
const updatingItem = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmLoading = ref(false)
const confirmActionType = ref('')
const confirmMessage = ref('')
const confirmSeverity = ref('danger')
const confirmCallback = ref(null)

// Request form
const requestForm = ref({
  model_id: '',
  student_email: '',
  class_prefix: '',
  class_number: null,
  quantity: 1
})

const missingrequestForm = ref({
  model: '',
  description: '',
  image_link: '',
  student_email: '',
  class_prefix: '',
  class_number: null,
  quantity: 1
})

onMounted(() => {
  loadData()
  resetRequestForm()
  resetMissingRequestForm() 
})

// New item form (for admin)
const newItem = ref({
  model: '',
  description: '',
  link: '',
  quantity: 0,
  location: '',
  status: 'available'
})

// Options
const classPrefixes = ref(['Freshman', 'Sophomore RE','Sophomore CSE','Junior RE', 'Junior CSE','Senior RE', 'Senior CSE', 'Final Year RE', 'Final Year CSE',"L1", "L2", "L3"])
const classNumbers = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const statusOptions = ref(['available', 'reserved', 'maintenance', 'broken'])

// Computed properties
const userEmail = computed(() => user.value?.email || '')
const userRole = computed(() => user.value?.role || 'student')

// Stats
const totalItems = computed(() => inventoryItems.value.length)
const lowStockItems = computed(() => inventoryItems.value.filter(item => item.quantity < 10 && item.quantity > 0).length)
const outOfStockItems = computed(() => inventoryItems.value.filter(item => item.quantity === 0).length)
const inStockItems = computed(() => inventoryItems.value.filter(item => item.quantity > 0).length)

// Filter items based on search
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return [...inventoryItems.value].sort((a, b) => (a.id || 0) - (b.id || 0))
  }
  
  const searchTerm = searchQuery.value.toLowerCase().trim()
  return inventoryItems.value.filter(item => {
    return Object.values(item).some(value => {
      if (value === null || value === undefined) return false
      return String(value).toLowerCase().includes(searchTerm)
    })
  }).sort((a, b) => (a.id || 0) - (b.id || 0))
})

// Pagination computed properties
const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage.value))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, filteredItems.value.length))
const paginatedItems = computed(() => filteredItems.value.slice(startIndex.value, endIndex.value))

// Pagination controls
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 4
  
  if (totalPages.value <= maxVisible) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    if (currentPage.value <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages.value)
    } else if (currentPage.value >= totalPages.value - 2) {
      pages.push(1)
      pages.push('...')
      for (let i = totalPages.value - 3; i <= totalPages.value; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      pages.push(currentPage.value - 1)
      pages.push(currentPage.value)
      pages.push(currentPage.value + 1)
      pages.push('...')
      pages.push(totalPages.value)
    }
  }
  
  return pages
})

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    expandedItemId.value = null
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    expandedItemId.value = null
  }
}

const goToPage = (page) => {
  currentPage.value = page
  expandedItemId.value = null
}

const resetMissingRequestForm = () => {
  missingrequestForm.value = {
    model: '',
    description: '',
    image_link: '',
    student_email: userEmail.value,
    class_prefix: '',
    class_number: null,
    quantity: 1
  }
}

// Load data - using fetch instead of $fetch
const loadData = async () => {
  loading.value = true
  try {
    const response = await fetch(`${apiUrl}/inventory/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      inventoryItems.value = data.data.sort((a, b) => (a.id || 0) - (b.id || 0))
      
      toast.add({
        severity: 'success',
        summary: 'Data Loaded',
        detail: `Loaded ${data.data.length} inventory items`,
        life: 3000
      })
    } else {
      throw new Error(data.message || 'Failed to load data')
    }
  } catch (error) {
    console.error('Error loading data:', error)
    
    // Handle 401 unauthorized
    if (error.message?.includes('401') || error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }
    
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load inventory data',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Toggle item expansion
const toggleItemExpansion = (item) => {
  if (expandedItemId.value === item.id) {
    expandedItemId.value = null
    selectedItems.value = null
  } else {
    expandedItemId.value = item.id
    selectedItems.value = item
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

// Open request dialog
const openRequestDialog = (item) => {
  selectedItems.value = item
  requestForm.value.model_id = item.id
  requestForm.value.student_email = userEmail.value
  requestForm.value.quantity = 1
  showRequestDialog.value = true
}

// Submit request - using fetch (already done)
const submitRequest = async () => {
  if (!selectedItems.value) {
    toast.add({
      severity: 'warn',
      summary: 'No Item Selected',
      detail: 'Please select an item first',
      life: 3000
    })
    return
  }

  if (!requestForm.value.class_prefix || !requestForm.value.class_number) {
    toast.add({
      severity: 'warn',
      summary: 'Class Required',
      detail: 'Please select both class prefix and number',
      life: 3000
    })
    return
  }

  if (requestForm.value.quantity < 1) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid Quantity',
      detail: 'Quantity must be at least 1',
      life: 3000
    })
    return
  }

  submittingRequest.value = true
  
  const requestData = {
    model_id: selectedItems.value.id,
    student_email: requestForm.value.student_email || userEmail.value,
    class_name: `${requestForm.value.class_prefix} G${requestForm.value.class_number}`,
    quantity: requestForm.value.quantity
  }

  try {
    const response = await fetch(`${apiUrl}/requests/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestData)
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      toast.add({
        severity: 'success',
        summary: 'Request Submitted',
        detail: 'Your request has been submitted successfully',
        life: 3000
      })
      window.dispatchEvent(new CustomEvent('cart-updated', { 
        detail: { 
          type: 'item',
          itemId: selectedItems.value.id,
          itemName: selectedItems.value.name 
        }
      }))
      showRequestDialog.value = false
      resetRequestForm()
      expandedItemId.value = null
      loadData()
    } else {
      throw new Error(data.message || 'Failed to submit request')
    }
  } catch (error) {
    console.error('Error submitting request:', error)
    
    toast.add({
      severity: 'error',
      summary: 'Request Failed',
      detail: error.message || 'Failed to submit request',
      life: 5000
    })
  } finally {
    submittingRequest.value = false
  }
}

// Submit missing item request - using fetch instead of $fetch
const submitMissing = async () => {
  // Validation
  if (!missingrequestForm.value.model?.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Model Name Required',
      detail: 'Please enter a model name or reference',
      life: 3000
    })
    return
  }
  if (missingrequestForm.value.model.trim().length > 60) {
    toast.add({
      severity: 'error',
      summary: 'Model Name Too Long',
      detail: 'Model name too long',
      life: 3000
    })
    return
  }
  if (!missingrequestForm.value.class_prefix || !missingrequestForm.value.class_number) {
    toast.add({
      severity: 'warn',
      summary: 'Class Required',
      detail: 'Please select both class cohort and group',
      life: 3000
    })
    return
  }

  if (missingrequestForm.value.quantity < 1) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid Quantity',
      detail: 'Quantity must be at least 1',
      life: 3000
    })
    return
  }

  submittingMissingRequest.value = true
  
  const requestData = {
    model: missingrequestForm.value.model?.trim(),  
    model_description: missingrequestForm.value.description?.trim(),
    student_email: missingrequestForm.value.student_email?.trim() || userEmail.value,
    class_name: `${missingrequestForm.value.class_prefix} G${missingrequestForm.value.class_number}`,
    quantity: missingrequestForm.value.quantity
  }

  try {
    const response = await fetch(`${apiUrl}/missing/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestData)
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      toast.add({
        severity: 'success',
        summary: 'Request Submitted',
        detail: 'Your request for an unavailable item has been submitted successfully',
        life: 3000
      })
      
      showMissingDialog.value = false
      window.dispatchEvent(new CustomEvent('cart-updated', { 
        detail: { 
          type: 'missing-item',
          model_name: missingrequestForm.value.model.trim(),
          quantity: missingrequestForm.value.quantity
        }
      }))
      
      resetMissingRequestForm()
    } else {
      throw new Error(data.message || data.error || 'Failed to submit request')
    }
  } catch (error) {
    console.error('Error submitting missing item request:', error)
    toast.add({
      severity: 'error',
      summary: 'Request Failed',
      detail: error.message || 'Failed to submit request for unavailable item',
      life: 5000
    })
  } finally {
    submittingMissingRequest.value = false
  }
}

// Open update dialog
const openUpdateDialog = (item) => {
  if (!item) {
    toast.add({
      severity: 'warn',
      summary: 'No Item Selected',
      detail: 'Please select an item first',
      life: 3000
    })
    return
  }
  selectedItems.value = item
  showUpdateDialog.value = true
}

// Update selected item
const updateSelectedItem = () => {
  if (!selectedItems.value) {
    toast.add({
      severity: 'warn',
      summary: 'No Item Selected',
      detail: 'Please select an item to update',
      life: 3000
    })
    return
  }

  const itemName = selectedItems.value.model || selectedItems.value.name || 'this item'
  
  showConfirmation(
    'update',
    `Are you sure you want to update "${itemName}"?`,
    'warning',
    performUpdate
  )
}

// Actual update logic - using fetch instead of $fetch
const performUpdate = async () => {
  updatingItem.value = true
  
  try {
    const itemId = selectedItems.value.id
    
    const updateData = {
      model: selectedItems.value.model,
      description: selectedItems.value.description || '',
      link: selectedItems.value.link || '',
      quantity: selectedItems.value.quantity || 0,
      location: selectedItems.value.location || '',
    }

    const response = await fetch(`${apiUrl}/inventory/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updateData) 
    })
    
    const data = await response.json()

    if (response.ok && data.success) {
      toast.add({
        severity: 'success',
        summary: 'Item Updated',
        detail: 'Item has been updated successfully',
        life: 3000
      })
      
      const index = inventoryItems.value.findIndex(item => item.id === itemId)
      if (index !== -1) {
        inventoryItems.value[index] = { ...inventoryItems.value[index], ...updateData }
      }
      
      showUpdateDialog.value = false
      expandedItemId.value = null
      
      await loadData()
    } else {
      throw new Error(data.message || `Update failed with status ${response.status}`)
    }
  } catch (error) {
    console.error('Update error:', error)
    toast.add({
      severity: 'error',
      summary: 'Update Failed',
      detail: error.message || 'Failed to update item',
      life: 5000
    })
    throw error
  } finally {
    updatingItem.value = false
  }
}

// Delete selected item (admin only) - using fetch instead of $fetch
const deleteSelectedItem = (item) => {
  if (!item) return
  
  selectedItems.value = item
  const itemName = item.model || item.name || 'this item'
  
  showConfirmation(
    'delete',
    `Are you sure you want to delete "${itemName}"?`,
    'danger',
    async () => {
      const itemId = item.id
      
      try {
        const response = await fetch(`${apiUrl}/inventory/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          toast.add({
            severity: 'success',
            summary: 'Item Deleted',
            detail: 'Item has been deleted successfully',
            life: 3000
          })
          loadData()
          expandedItemId.value = null
          selectedItems.value = null
        } else {
          throw new Error(data.message || 'Failed to delete item')
        }
      } catch (error) {
        console.error('Error deleting item:', error)
        toast.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error.message || 'Failed to delete item',
          life: 5000
        })
        throw error
      }
    }
  )
}

// Add new item (admin only) - using fetch instead of $fetch
const addNewItem = async () => {
  // Validation
  if (!newItem.value.model?.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Model Name Required',
      detail: 'Please enter a model name',
      life: 3000
    })
    return
  }

  if (newItem.value.quantity < 0) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid Quantity',
      detail: 'Quantity cannot be negative',
      life: 3000
    })
    return
  }

  addingItem.value = true

  const itemData = {
    model: newItem.value.model.trim(),
    description: newItem.value.description?.trim() || '',
    link: newItem.value.link?.trim() || '',
    quantity: newItem.value.quantity || 0,
    location: newItem.value.location?.trim() || '',
  }

  try {
    const response = await fetch(`${apiUrl}/inventory/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(itemData)
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      toast.add({
        severity: 'success',
        summary: 'Item Added',
        detail: 'New item has been added successfully',
        life: 3000
      })

      newItem.value = {
        model: '',
        description: '',
        link: '',
        quantity: 0,
        location: '',
        status: 'available'
      }
      
      showAddDialog.value = false
      
      loadData()
    } else {
      throw new Error(data.message || 'Failed to add item')
    }
  } catch (error) {
    console.error('Error adding item:', error)
    toast.add({
      severity: 'error',
      summary: 'Add Failed',
      detail: error.message || 'Failed to add new item',
      life: 5000
    })
  } finally {
    addingItem.value = false
  }
}

// Reset forms
const resetRequestForm = () => {
  requestForm.value = {
    model_id: '',
    student_email: userEmail.value,
    class_prefix: '',
    class_number: null,
    quantity: 1
  }
}

const resetNewItemForm = () => {
  newItem.value = {
    model: '',
    description: '',
    link: '',
    quantity: 0,
    location: '',
  }
}

// Handle search
const handleSearch = () => {
  currentPage.value = 1
  expandedItemId.value = null
}

// Helper functions
const getQuantitySeverity = (quantity) => {
  if (quantity === 0) return 'danger'
  if (quantity < 10) return 'warning'
  if (quantity < 20) return 'info'
  return 'success'
}

const truncateDescription = (description) => {
  if (!description) return 'No description'
  if (description.length > 100) {
    return description.substring(0, 100) + '...'
  }
  return description
}

const getStockClass = (quantity) => {
  if (quantity === 0) return 'out-of-stock'
  if (quantity < 10) return 'low-stock'
  return 'in-stock'
}

const getStockText = (quantity) => {
  if (quantity === 0) return 'Out of Stock'
  if (quantity < 10) return 'Low Stock'
  return 'In Stock'
}

const handleImageError = (event) => {
  event.target.src = '/placeholder-image.png'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (e) {
    return 'N/A'
  }
}

// Define page meta for layout/navigation
definePageMeta({
  layout: 'default',
  middleware: 'auth',
  requiresAuth: true
})
</script>
<style scoped>
/* Keep all your existing styles exactly as they are */
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  width: 100%;
  overflow-x: hidden;
}

.main-container {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.content-wrapper {
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
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
  width: 100%;
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

/* Product Grid Styles */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.product-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.product-card.selected {
  border-color: #3b82f6;
}

.product-card.expanded {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.product-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: #f8fafc;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1rem;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.stock-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.stock-badge.in-stock {
  background-color: #10b981;
}

.stock-badge.low-stock {
  background-color: #f59e0b;
}

.stock-badge.out-of-stock {
  background-color: #ef4444;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.product-info {
  padding: 1rem;
}

.product-id {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.product-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.product-description {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.detail-item i {
  font-size: 0.875rem;
}

/* Expanded Content */
.expanded-content {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  animation: slideDown 0.3s ease-out;
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

.admin-actions {
  margin-bottom: 1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.action-button {
  width: 100%;
}

.student-actions {
  margin-bottom: 1rem;
}

.request-button {
  width: 100%;
}

.out-of-stock-note {
  font-size: 0.875rem;
  color: #ef4444;
  margin-top: 0.5rem;
  text-align: center;
}

.additional-details {
  background: #f1f5f9;
  padding: 0.75rem;
  border-radius: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #64748b;
  font-weight: 500;
}

.detail-value {
  color: #334155;
}

.detail-link {
  color: #3b82f6;
  text-decoration: none;
}

.detail-link:hover {
  text-decoration: underline;
}

/* Pagination */
.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  font-size: 0.875rem;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.page-number:hover:not(.active):not(.ellipsis) {
  background-color: #f1f5f9;
  color: #334155;
}

.page-number.active {
  background-color: #3b82f6;
  color: white;
}

.page-number.ellipsis {
  cursor: default;
  pointer-events: none;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.page-select {
  width: 100px;
}

/* Summary Container */
.summary-container {
  padding: 1.5rem;
  margin-top: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.summary-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  flex: 1;
  min-width: 120px;
  padding: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.empty-state h3 {
  font-size: 1.5rem;
  color: #1e293b;
  margin: 1rem 0 0.5rem 0;
}

.empty-state p {
  color: #64748b;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-state p {
  margin-top: 1rem;
  color: #64748b;
}

/* Request Dialog Preview */
.request-item-preview {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.request-item-image {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 6px;
  background: white;
  padding: 0.25rem;
}

.request-item-info {
  flex: 1;
}

.request-item-info h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

/* MOBILE FIX */
@media (max-width: 1000px) {
  .home {
    padding: 0;
    margin: 0;
  }
  .card.mb-6 {
    margin-bottom: 1rem !important; 
  }
  
  .main-container {
    padding: 0;
    margin: 0;
    width: 100vw;
    max-width: 100vw;
  }
  
  .content-wrapper {
    max-width: 100vw;
    margin: 0;
    padding: 0;
    width: 100vw;
  }
  
  .main-content-area {
    flex-direction: column;
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 0 !important;
    gap: 0;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .table-section {
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 0 1rem !important;
    box-sizing: border-box;
  }
  
  .card.mb-6 {
    margin-bottom: 1rem !important; 
  }
  
  .header-section {
    padding: 0 1rem;
    box-sizing: border-box;
  }
  
  .pagination-container {
    padding: 0.75rem;
  }
  
  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .page-numbers {
    flex-wrap: wrap;
    justify-content: center;
  }

  .summary-stats {
    gap: 0.5rem;
  }
  
  .stat-item {
    min-width: 100px;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
}

/* Responsive grid */
@media (max-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination-controls {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .stat-item {
    min-width: auto;
  }
}

/* The rest of your existing styles remain as they are */
.home .page-header {
  margin-bottom: 16px;
}

.home .toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.home .content-wrapper {
  gap: 16px;
}

.home .table-section {
  padding: 16px;
}

.home table {
  margin-top: 8px;
}

.home .pagination {
  margin-top: 12px;
}

.home .summary-section {
  margin-top: 16px;
}

.home .toolbar {
  margin-bottom: 24px;
}

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning {
  color: #856404;
  background-color: #fff3cd;
  border-color: #ffeeba;
  padding: 10px;
  border-radius: 5px;
}

.supplier {
  color: #0d6efd;
  text-decoration: none;
  font-weight: bold;
}

.supplier:hover {
  text-decoration: underline;
}

.supplier:visited {
  color: #6610f2;
}

.instruction{
  color: black;
  background-color: #e9ecef;
  border-color: #ced4da;
  padding: 10px;
  border-radius: 5px;
}

.card.mb-6 {
    margin-bottom: 1rem !important; 
  }
</style>