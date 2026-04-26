<!-- pages/inventory/index.vue -->
<template>
  <div class="home">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <div>
            <h1 class="page-title">
              {{ userRole === 'admin' || userRole ==='superadmin' ? 'Inventory Management' : 'Inventory Catalog' }}
            </h1>
            <p class="page-subtitle">
              {{ userRole === 'admin' || userRole ==='superadmin' ? 'Manage all inventory items' : 'Browse and request for components' }}
            </p>
          </div>
        </div>

        <!-- Search and Actions -->
        <div class="card action-card">
          <div class="action-bar">
            <!-- Search with Column Filter (Admin only) -->
            <div class="search-wrapper" :class="{ 'with-filter': userRole === 'admin' || userRole ==='superadmin' || userRole === 'instructor' }">
              <div class="search-container">
                <IconField class="search-input">
                  <InputIcon class="pi pi-search" />
                  <InputText 
                    v-model="searchQuery" 
                    :placeholder="searchPlaceholder"
                    class="w-full"
                    @input="handleSearch"
                  />
                </IconField>
                
                <!-- Column Filter Dropdown (Admin only) -->
                <Select 
                  v-if="userRole === 'admin' || userRole ==='superadmin' || userRole === 'instructor'"
                  v-model="selectedSearchColumn"
                  :options="searchableColumns"
                  optionLabel="label"
                  optionValue="value"
                  class="column-filter-dropdown"
                  @change="handleSearch"
                >
                  <template #value="slotProps">
                    <div v-if="slotProps.value" class="column-filter-value">
                      <i :class="getColumnIcon(slotProps.value)"></i>
                      <span>{{ getColumnLabel(slotProps.value) }}</span>
                    </div>
                    <span v-else>All Columns</span>
                  </template>
                  <template #option="slotProps">
                    <div class="column-filter-option">
                      <i :class="getColumnIcon(slotProps.option.value)"></i>
                      <span>{{ slotProps.option.label }}</span>
                    </div>
                  </template>
                </Select>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons-group">
              <Button 
                label="Refresh" 
                icon="pi pi-refresh" 
                @click="loadData"
                :loading="loading"
                class="action-btn refresh-btn"
                severity="secondary"
              />
              <Button 
                v-if="userRole === 'admin' || userRole ==='superadmin'"   
                label="Add Item" 
                icon="pi pi-plus" 
                @click="showAddDialog = true" 
                class="action-btn primary-gradient"
                severity="primary"  
              />
              <Button 
                v-if="userRole === 'admin' || userRole ==='superadmin' || userRole === 'instructor'"   
                label="Export CSV"
                icon="pi pi-file-export" 
                @click="exportCSV(filteredItems, 'inventory_export.csv')"
                class="action-btn primary-gradient"
                severity="primary"
              />
              <Button 
                v-if="userRole === ''"
                label="Request Unavailable Item" 
                icon="pi pi-exclamation-circle" 
                @click="showMissingDialog = true" 
                class="action-btn warning-gradient"
                severity="info"
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
                      <i class="pi pi-box"></i>
                      <span>{{ item.quantity }} in stock</span>
                    </div>
                    <div v-if="item.location" class="detail-item">
                      <i class="pi pi-map-marker"></i>
                      <span>{{ item.location }}</span>
                    </div>
                    <div v-if="item.category" class="detail-item">
                      <i class="pi pi-tag"></i>
                      <span>{{ item.category }}</span>
                    </div>
                  </div>

                  <!-- Expanded Content -->
                  <div v-if="expandedItemId === item.id" class="expanded-content">
                    <!-- Admin Actions -->
                    <div v-if="userRole === 'admin' || userRole ==='superadmin'" class="admin-actions">
                      <div class="action-grid">
                        <Button 
                          label="Edit" 
                          icon="pi pi-pencil" 
                          class="action-grid-btn edit-btn"
                          @click.stop="openUpdateDialog(item)"
                          size="small"
                        />
                        <Button 
                          label="Delete" 
                          icon="pi pi-trash" 
                          class="action-grid-btn delete-btn"
                          @click.stop="deleteSelectedItem(item)"
                          size="small"
                        />
                        <Button 
                          label="Request" 
                          icon="pi pi-shopping-cart" 
                          class="action-grid-btn request-btn"
                          @click.stop="openRequestDialog(item)"
                          size="small"
                        />
                      </div>
                    </div>
                    
                    <!-- Student Actions -->
                    <div v-if="userRole === 'student' || userRole === 'instructor'" class="student-actions">
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
              <div class="empty-state-content">
                <i class="pi pi-box empty-icon"></i>
                <h3>No items found</h3>
                <p v-if="searchQuery">Try adjusting your search query</p>
                <p v-else>Inventory is currently empty</p>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
              <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
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
                  class="pagination-nav-btn"
                  text
                  rounded
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
                  class="pagination-nav-btn"
                  text
                  rounded
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

            <!-- Stats Summary Container (Admin only - now clickable for filtering) -->
            <div v-if="userRole === 'admin' || userRole ==='superadmin' || userRole === 'instructor' && filteredItems.length > 0" class="summary-container">
              <div class="summary-header">
                <h3>Inventory Summary</h3>
                <Button 
                  v-if="activeFilter !== 'all'"
                  label="Clear Filter" 
                  icon="pi pi-times" 
                  @click="clearSummaryFilter"
                  class="clear-filter-btn"
                  text
                  size="small"
                />
              </div>
              <div class="summary-stats">
                <div 
                  class="stat-item clickable" 
                  :class="{ 'active-filter': activeFilter === 'all' }"
                  @click="filterBySummary('all')"
                >
                  <div class="stat-value total">{{ totalItems }}</div>
                  <div class="stat-label">Total Items</div>
                </div>
                <div 
                  class="stat-item clickable" 
                  :class="{ 'active-filter': activeFilter === 'low-stock' }"
                  @click="filterBySummary('low-stock')"
                >
                  <div class="stat-value low-stock">{{ lowStockItems }}</div>
                  <div class="stat-label">Low Stock</div>
                </div>
                <div 
                  class="stat-item clickable" 
                  :class="{ 'active-filter': activeFilter === 'out-of-stock' }"
                  @click="filterBySummary('out-of-stock')"
                >
                  <div class="stat-value out-of-stock">{{ outOfStockItems }}</div>
                  <div class="stat-label">Out of Stock</div>
                </div>
                <div 
                  class="stat-item clickable" 
                  :class="{ 'active-filter': activeFilter === 'in-stock' }"
                  @click="filterBySummary('in-stock')"
                >
                  <div class="stat-value in-stock">{{ inStockItems }}</div>
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
      v-if="userRole === 'admin' || userRole ==='superadmin'"
      v-model:visible="showUpdateDialog" 
      :style="{ width: '500px' }" 
      header="Update Item"
      :modal="true"
      class="custom-dialog"
    >
      <div class="dialog-form">
        <div class="form-field">
          <label for="updateModel">Model</label>
          <InputText 
            id="updateModel"
            v-model="selectedItems.model"
            class="form-input"
          />
        </div>

        <div class="form-field">
          <label for="updateDescription">Description</label>
          <InputText 
            id="updateDescription"
            v-model="selectedItems.description"
            class="form-input"
          />
        </div>

        <div class="form-field">
          <label for="updateLink">Image URL</label>
          <InputText 
            id="updateLink"
            v-model="selectedItems.link"
            class="form-input"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div class="form-field">
          <label for="updateQuantity">Quantity</label>
          <InputNumber 
            id="updateQuantity"
            v-model="selectedItems.quantity"
            :min="0"
            showButtons
            class="form-input"
          />
        </div>

        <div class="form-field">
          <label for="updateLocation">Location</label>
          <InputText 
            id="updateLocation"
            v-model="selectedItems.location"
            class="form-input"
          />
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showUpdateDialog = false" 
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Update" 
          icon="pi pi-check" 
          @click="updateSelectedItem"
          :loading="updatingItem"
          class="dialog-btn confirm-btn primary-gradient"
        />
      </template>
    </Dialog>

    <!-- Request Item Dialog -->
    <Dialog 
      v-model:visible="showRequestDialog" 
      :style="{ width: '450px' }" 
      header="Request Item"
      :modal="true"
      class="custom-dialog"
    >
      <div class="dialog-form">
        <!-- Item Preview -->
        <div v-if="selectedItems" class="request-item-preview">
          <img 
            :src="selectedItems.link || '/placeholder-image.png'" 
            :alt="selectedItems.model"
            class="request-item-image"
          />
          <div class="request-item-info">
            <h4>{{ selectedItems.model || selectedItems.name }}</h4>
            <div class="stock-indicator">
              <Badge 
                :value="selectedItems.quantity" 
                :severity="getQuantitySeverity(selectedItems.quantity)"
              />
              <span class="stock-text"> available</span>
            </div>
          </div>
        </div>

        <div class="form-field">
          <label for="quantity">Quantity</label>
          <InputNumber 
            id="quantity"
            v-model="requestForm.quantity"
            :min="1"
            showButtons
            class="form-input"
          />
        </div>

        <div class="form-field">
          <label>Class</label>
          <div class="class-selectors">
            <Select 
              v-model="requestForm.class_prefix"
              :options="classPrefixes"
              placeholder="Cohort"
              class="class-select"
            />
            <Select 
              v-model="requestForm.class_number"
              :options="classNumbers"
              placeholder="Group"
              class="class-select"
            />
          </div>
        </div>

        <div class="form-field">
          <label for="studentEmail">Student Email</label>
          <InputText 
            id="studentEmail"
            v-model="requestForm.student_email"
            :placeholder="userEmail"
            readonly
            class="form-input readonly"
          />
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showRequestDialog = false" 
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Submit Request" 
          icon="pi pi-check" 
          @click="submitRequest" 
          :loading="submittingRequest"
          class="dialog-btn confirm-btn success-gradient"
        />
      </template>
    </Dialog>

    <!-- Confirmation Dialog -->
    <Dialog 
      v-model:visible="showConfirmDialog" 
      :style="{ width: '450px' }" 
      header="Confirmation"
      :modal="true"
      class="confirm-dialog"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle warning-icon" />
        <span>{{ confirmMessage }}</span>
      </div>
      
      <template #footer>
        <Button 
          label="No" 
          icon="pi pi-times" 
          @click="showConfirmDialog = false" 
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Yes" 
          icon="pi pi-check" 
          @click="confirmAction" 
          :loading="confirmLoading"
          class="dialog-btn confirm-btn danger-gradient"
        />
      </template>
    </Dialog>

    <!-- Request unavailable Item Dialog -->
    <Dialog 
      v-model:visible="showMissingDialog" 
      :style="{ width: '600px' }" 
      header="Request an Unavailable Item"
      :modal="true"
      class="custom-dialog missing-dialog"
    >
      <div class="dialog-form">
        <div class="supplier-section">
          <a class="supplier-link" href="https://tuni-smart-innovation.com/" target="_blank" rel="noopener noreferrer">
            <i class="pi pi-external-link"></i>
            Tunisia Smart Innovation
          </a>
        </div>

        <div class="instruction-box">
          <i class="pi pi-info-circle"></i>
          <p>This is a link to our supplier website. If you find the item you need, please copy the link and paste it below.</p>
        </div>

        <div class="form-field">
          <label for="modelName">Model Name</label>
          <InputText 
            id="modelName"
            v-model="missingrequestForm.model"
            placeholder="e.g. Raspberry Pi 4"
            class="form-input"
          />
        </div>

        <div class="form-field">
          <label for="description">Product Link</label>
          <InputText 
            id="description"
            v-model="missingrequestForm.description"
            placeholder="Paste product link here"
            class="form-input"
          />
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label for="quantity">Quantity</label>
            <InputNumber 
              id="quantity"
              v-model="missingrequestForm.quantity"
              :min="1"
              showButtons
              class="form-input"
            />
          </div>

          <div class="form-field flex-1">
            <label for="studentEmail">Student Email</label>
            <InputText 
              id="studentEmail"
              v-model="missingrequestForm.student_email"
              :placeholder="userEmail"
              readonly
              class="form-input readonly"
            />
          </div>
        </div>

        <div class="form-field">
          <label>Class</label>
          <div class="class-selectors">
            <Select 
              v-model="missingrequestForm.class_prefix"
              :options="classPrefixes"
              placeholder="Cohort"
              class="class-select"
            />
            <Select 
              v-model="missingrequestForm.class_number"
              :options="classNumbers"
              placeholder="Group"
              class="class-select"
            />
          </div>
        </div>

        <div class="warning-box">
          <i class="pi pi-exclamation-triangle"></i>
          <p>Please do not request an item that is already on the inventory list even if it's out of stock, and do not request an item that is not listed on the supplier website.</p>
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showMissingDialog = false" 
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Submit Request" 
          icon="pi pi-check" 
          @click="submitMissing" 
          :loading="submittingMissingRequest"
          class="dialog-btn confirm-btn warning-gradient"
        />
      </template>
    </Dialog>

    <!-- Add Item Dialog (Admin only) -->
    <Dialog 
      v-if="userRole === 'admin' || userRole ==='superadmin'"
      v-model:visible="showAddDialog" 
      :style="{ width: '500px' }" 
      header="Add New Item"
      :modal="true"
      class="custom-dialog"
    >
      <div class="dialog-form">
        <div class="form-field">
          <label for="itemName">Model Name</label>
          <InputText id="itemName" v-model="newItem.model" class="form-input" />
        </div>

        <div class="form-field">
          <label for="itemDescription">Description</label>
          <InputText id="itemDescription" v-model="newItem.description" class="form-input" />
        </div>

        <div class="form-field">
          <label for="itemLink">Image URL</label>
          <InputText 
            id="itemLink"
            v-model="newItem.link"
            class="form-input"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div class="form-field">
          <label for="itemQuantity">Quantity</label>
          <InputNumber 
            id="itemQuantity"
            v-model="newItem.quantity"
            :min="0"
            class="form-input"
          />
        </div>

        <div class="form-field">
          <label for="itemLocation">Location</label>
          <InputText id="itemLocation" v-model="newItem.location" class="form-input" />
        </div>
      </div>

      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showAddDialog = false; resetNewItemForm()"  
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Add Item" 
          icon="pi pi-check" 
          @click="addNewItem" 
          :loading="addingItem"
          class="dialog-btn confirm-btn primary-gradient"
        />
      </template>
    </Dialog>

    <!-- Toast -->
    <Toast position="top-right" />
  </div>
</template>

<script setup>
import { useToast } from 'primevue/usetoast'
import { exportCSV } from '~/utils/exportCSV.js' 

const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()

// State
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const inventoryItems = ref([])
const loading = ref(false)
const selectedItems = ref(null)
const searchQuery = ref('')
const expandedItemId = ref(null)

// Filter state (admin only)
const selectedSearchColumn = ref('all')
const activeFilter = ref('all') // Track which summary filter is active

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const itemsPerPageOptions = ref([5, 10, 15, 30, 50, 100])
const lastUsedClassPrefix = ref('')
const lastUsedClassNumber = ref(null)
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
  // Load saved class values from localStorage
  const savedPrefix = localStorage.getItem('lastUsedClassPrefix')
  const savedNumber = localStorage.getItem('lastUsedClassNumber')
  
  if (savedPrefix) lastUsedClassPrefix.value = savedPrefix
  if (savedNumber) lastUsedClassNumber.value = parseInt(savedNumber)
  
  loadData()
  resetRequestForm()
  resetMissingRequestForm()
})

// Add watchers to persist to localStorage
watch(lastUsedClassPrefix, (newValue) => {
  if (newValue) {
    localStorage.setItem('lastUsedClassPrefix', newValue)
  }
})

watch(lastUsedClassNumber, (newValue) => {
  if (newValue) {
    localStorage.setItem('lastUsedClassNumber', newValue.toString())
  }
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
const classPrefixes = ref(['Freshman', 'Sophomore RE','Sophomore CSE','Junior RE', 'Junior CSE','Senior RE', 'Senior CSE', 'Final Year RE', 'Final Year CSE',"Licence","HEC"])
const classNumbers = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

// Searchable columns configuration (admin only)
const searchableColumns = ref([
  { label: 'All Columns', value: 'all', icon: 'pi pi-search' },
  { label: 'Model Name', value: 'model', icon: 'pi pi-tag' },
  { label: 'Description', value: 'description', icon: 'pi pi-align-left' },
  { label: 'Quantity', value: 'quantity', icon: 'pi pi-box' },
  { label: 'Location', value: 'location', icon: 'pi pi-map-marker' },

])

// Helper functions for column filter
const getColumnIcon = (columnValue) => {
  const column = searchableColumns.value.find(col => col.value === columnValue)
  return column ? column.icon : 'pi pi-search'
}

const getColumnLabel = (columnValue) => {
  const column = searchableColumns.value.find(col => col.value === columnValue)
  return column ? column.label : 'All Columns'
}

const searchPlaceholder = computed(() => {
  if (userRole.value === 'student') return 'Search across all columns...'
  const columnLabel = getColumnLabel(selectedSearchColumn.value)
  return `Search in ${columnLabel.toLowerCase()}...`
})

// Computed properties
const userEmail = computed(() => user.value?.email || '')
const userRole = computed(() => user.value?.role || 'student')

// Stats
const totalItems = computed(() => inventoryItems.value.length)
const lowStockItems = computed(() => inventoryItems.value.filter(item => item.quantity < 10 && item.quantity > 0).length)
const outOfStockItems = computed(() => inventoryItems.value.filter(item => item.quantity === 0).length)
const inStockItems = computed(() => inventoryItems.value.filter(item => item.quantity > 0).length)

// Apply summary filter
const applySummaryFilter = (items) => {
  if (userRole.value === 'student' || activeFilter.value === 'all') {
    return items
  }
  
  switch (activeFilter.value) {
    case 'low-stock':
      return items.filter(item => item.quantity < 10 && item.quantity > 0)
    case 'out-of-stock':
      return items.filter(item => item.quantity === 0)
    case 'in-stock':
      return items.filter(item => item.quantity > 0)
    default:
      return items
  }
}

// Filter by summary category
const filterBySummary = (filterType) => {
  if (userRole.value === 'student') return
  
  activeFilter.value = filterType
  currentPage.value = 1
  expandedItemId.value = null
  
  toast.add({
    severity: 'info',
    summary: 'Filter Applied',
    detail: filterType === 'all' ? 'Showing all items' : `Showing ${filterType.replace('-', ' ')} items`,
    life: 2000
  })
}

// Clear summary filter
const clearSummaryFilter = () => {
  activeFilter.value = 'all'
  currentPage.value = 1
  
  toast.add({
    severity: 'info',
    summary: 'Filter Cleared',
    detail: 'Showing all items',
    life: 2000
  })
}

// Filter items based on search and summary filter
const filteredItems = computed(() => {
  let items = [...inventoryItems.value]
  
  // Apply summary filter first (admin only)
  items = applySummaryFilter(items)
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const searchTerm = searchQuery.value.toLowerCase().trim()
    const searchColumn = userRole.value === 'admin' || userRole.value === 'superadmin' || userRole.value === 'instructor' ? selectedSearchColumn.value : 'all'
    
    items = items.filter(item => {
      if (searchColumn === 'all') {
        // Search across all columns except link/image
        return Object.entries(item).some(([key, value]) => {
          // Skip link/image fields and null/undefined values
          if (key === 'link' || key === 'image' || key === 'image_link' || value === null || value === undefined) {
            return false
          }
          return String(value).toLowerCase().includes(searchTerm)
        })
      } else {
        // Search in specific column
        const value = item[searchColumn]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchTerm)
      }
    })
  }
  
  return items.sort((a, b) => (a.id || 0) - (b.id || 0))
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

// Load data
const loadData = async () => {
  loading.value = true
  try {
    const response = await fetch(`api/inventory/`, {
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

// Submit request
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
  lastUsedClassPrefix.value = requestForm.value.class_prefix
  lastUsedClassNumber.value = requestForm.value.class_number
  submittingRequest.value = true
  
  const requestData = {
    model_id: selectedItems.value.id,
    student_email: requestForm.value.student_email || userEmail.value,
    class_name: `${requestForm.value.class_prefix} G${requestForm.value.class_number}`,
    quantity: requestForm.value.quantity
  }

  try {
    const response = await fetch(`api/requests/`, {
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

// Submit missing item request
const submitMissing = async () => {
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
    const response = await fetch(`api/missing/`, {
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

// Actual update logic
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

    const response = await fetch(`api/inventory/${itemId}`, {
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

// Delete selected item
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
        const response = await fetch(`api/inventory/${itemId}`, {
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

// Add new item
const addNewItem = async () => {
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
    const response = await fetch(`api/inventory/`, {
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
    class_prefix: lastUsedClassPrefix.value || '', // Use last used value
    class_number: lastUsedClassNumber.value || null, // Use last used value
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

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  requiresAuth: true
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  width: 100%;
  overflow-x: hidden;
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
  width: 100%;
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
  padding: 1rem;
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
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

.search-wrapper.with-filter {
  min-width: 450px;
}

.search-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.search-input {
  flex: 1;
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
  color: #667eea;
}

.column-filter-dropdown {
  min-width: 180px;
}

.column-filter-dropdown :deep(.p-dropdown) {
  border-radius: 8px;
  border-color: var(--border-default);
  height: 42px;
}

.column-filter-dropdown :deep(.p-dropdown:hover) {
  border-color: #667eea;
}

.column-filter-value,
.column-filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.column-filter-value i,
.column-filter-option i {
  font-size: 0.875rem;
  color: #667eea;
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

.warning-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.refresh-btn {
  background: var(--surface-0);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

/* Product Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Force 5 columns on desktop/laptop if zoomed to 80% */
@media screen and (min-width: 1500px) {
  .product-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.product-card {
  background: var(--surface-0);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
  border-color: #667eea;
}

.product-card.selected,
.product-card.expanded {
  border-color: #667eea;
  background: var(--surface-ground);
}

.product-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: var(--surface-ground);
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
  top: 1rem;
  left: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stock-badge.in-stock {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.stock-badge.low-stock {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stock-badge.out-of-stock {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.product-info {
  padding: 1.5rem;
}

.product-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.product-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
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
  color: var(--text-secondary);
}

.detail-item i {
  color: #667eea;
  font-size: 0.875rem;
}

/* Expanded Content */
.expanded-content {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-default);
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

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.action-grid-btn {
  width: 100%;
  font-weight: 600;
  border: none;
  transition: all 0.2s;
}

.action-grid-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.edit-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.delete-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.request-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.request-button {
  width: 100%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  color: white;
  font-weight: 600;
  margin-bottom: 1rem;
}

.additional-details {
  background: var(--surface-card);
  padding: 1rem;
  border-radius: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-value {
  color: var(--text-primary);
}

.detail-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
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
  padding: 1.5rem;
  background: var(--surface-0);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pagination-nav-btn {
  color: #667eea;
  transition: all 0.2s;
}

.pagination-nav-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.1);
  transform: scale(1.1);
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.page-number:hover:not(.active):not(.ellipsis) {
  background: var(--surface-card);
  color: var(--text-primary);
}

.page-number.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.page-number.ellipsis {
  cursor: default;
  color: var(--text-muted);
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.page-select {
  width: 120px;
}

.page-select :deep(.p-dropdown) {
  border-radius: 8px;
  border-color: var(--border-default);
}

/* Summary Container */
.summary-container {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--surface-0);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-default);
}

.summary-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.clear-filter-btn {
  color: var(--text-secondary);
}

.clear-filter-btn:hover {
  color: #ef4444;
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
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
  transition: all 0.2s;
}

.stat-item.clickable {
  cursor: pointer;
}

.stat-item.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-item.active-filter {
  border: 2px solid #667eea;
  background: #eef2ff;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}

.stat-value.total {
  color: #667eea;
}

.stat-value.low-stock {
  color: #f59e0b;
}

.stat-value.out-of-stock {
  color: #ef4444;
}

.stat-value.in-stock {
  color: #10b981;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem;
  background: var(--surface-0);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem;
  background: var(--surface-0);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-state p {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 1rem;
}

/* Dialog Styles */
.custom-dialog :deep(.p-dialog-header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
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
  border-radius: 0.5rem;
  border: 0.0625rem solid #e5e7eb;
  padding: 0.75rem;
  transition: all 0.2s;
}

.form-input :deep(.p-inputtext:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.form-input.readonly :deep(.p-inputtext) {
  background: var(--surface-card);
  color: var(--text-secondary);
}

.class-selectors {
  display: flex;
  gap: 0.75rem;
}

.class-select {
  flex: 1;
}

.class-select :deep(.p-dropdown) {
  width: 100%;
  border-radius: 8px;
  border-color: var(--border-default);
}

.request-item-preview {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.request-item-image {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--surface-0);
  padding: 0.25rem;
}

.request-item-info {
  flex: 1;
}

.request-item-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.stock-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stock-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Confirmation Dialog */
.confirm-dialog :deep(.p-dialog-header) {
  background: var(--surface-ground);
  color: var(--text-primary);
  padding: 1.5rem;
}

.confirmation-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
}

.warning-icon {
  font-size: 2rem;
  color: #f59e0b;
}

/* Missing Item Dialog */
.missing-dialog .supplier-section {
  text-align: center;
  margin-bottom: 1rem;
}

.supplier-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.supplier-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.instruction-box,
.warning-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.instruction-box {
  background: #e8f4fd;
  color: #0284c7;
  border: 1px solid #b8e1ff;
}

.warning-box {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.instruction-box i,
.warning-box i {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.instruction-box p,
.warning-box p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 {
  flex: 1;
}

/* Dialog Footer Buttons */
.dialog-btn {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.2s;
}

.dialog-btn.confirm-btn {
  color: white;
  border: none;
}

.dialog-btn.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dialog-btn.cancel-btn {
  color: var(--text-secondary);
}

.dialog-btn.cancel-btn:hover {
  background: var(--surface-card);
}

.success-gradient {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.danger-gradient {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

/* Responsive */
@media (max-width: 1200px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  
  .summary-stats {
    gap: 0.75rem;
  }
  
  .stat-item {
    min-width: 100px;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 900px) {
  .home {
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
  
  .search-wrapper.with-filter {
    min-width: 100%;
  }
  
  .search-container {
    flex-direction: column;
  }
  
  .column-filter-dropdown {
    width: 100%;
  }
  
  .action-buttons-group {
    justify-content: stretch;
  }
  
  .action-btn {
    flex: 1;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .product-grid {
    grid-template-columns: 1fr;
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
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .class-selectors {
    flex-direction: column;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .header-section {
    padding: 0.75rem;
  }
  
  .action-buttons-group {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .stat-item {
    padding: 0.75rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
  }
  
  .empty-state {
    padding: 2rem;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-state h3 {
    font-size: 1.25rem;
  }
}

/* ── Dark mode structural overrides ────────────────── */
/* Text colours are handled automatically via CSS variables above.  */
/* Only overrides that can't use variables are listed here.          */
:global(body.p-dark) .refresh-btn            { border-color: var(--border-default); }
:global(body.p-dark) .expanded-content       { border-top-color: var(--border-default); }
:global(body.p-dark) .summary-header         { border-bottom-color: var(--border-default); }
</style>