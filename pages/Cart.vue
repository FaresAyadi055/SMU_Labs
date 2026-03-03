<template>
  <div>
    <div class="cart-view">
      <div class="container mx-auto px-4 py-6">
        <!-- Header -->
        <div class="header-section">
          <div>
            <h1 class="text-3xl font-bold text-surface-900 mb-2">My Requests</h1>
            <br/>
            <p class="text-surface-600">View all your submitted requests</p>
            <br/>
          </div>
        </div>

        <!-- Loading State -->  
        <div v-if="loading" class="loading-state">
          <ProgressSpinner style="width: 50px; height: 50px" />
          <p>Loading requests...</p>
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Tabs for filtering -->
          <div class="filter-tabs mb-6">
            <div class="flex gap-2 border-b pb-2 overflow-x-auto">
              <Button 
                v-for="tab in tabs" 
                :key="tab.id"
                @click="activeTab = tab.id"
                :text="activeTab !== tab.id"
                :outlined="activeTab !== tab.id"
                :class="['tab-button', { 'active-tab': activeTab === tab.id }]"
                :severity="activeTab === tab.id ? 'primary' : 'secondary'"
              >
                {{ tab.label }} ({{ getRequestCount(tab.id) }})
              </Button>
            </div>
          </div>

          <!-- No Requests Message -->
          <div v-if="filteredRequests.length === 0" class="empty-state">
            <i class="pi pi-inbox text-6xl text-surface-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-surface-700 mb-2">No Requests Found</h3>
            <p class="text-surface-500">You haven't submitted any requests yet.</p>
          </div>

          <!-- Product Grid - Requests Cards -->
          <div v-else class="product-grid">
            <div 
              v-for="request in filteredRequests" 
              :key="request.id"
              class="product-card"
              :class="{ 'expanded': expandedRequestId === request.id }"
              @click="toggleRequestExpansion(request)"
            >
              <!-- Product Image -->
              <div class="product-image-container">
                <img 
                  :src="request.image_link || request.link || '/placeholder-image.png'" 
                  :alt="request.model"
                  class="product-image"
                  @error="handleImageError"
                />
                <!-- Status Badge -->
                <div class="stock-badge" :class="getStatusClass(request.status)">
                  {{ request.status || 'pending' }}
                </div>
              </div>

              <!-- Product Info -->
              <div class="product-info">
                <div class="flex justify-between items-start">
                  <h3 class="product-title">{{ request.model || 'Unknown Item' }}</h3>
                  <!-- Cancel button only for pending requests -->
                </div>
                
                <!-- Request Details -->
                <div class="product-details">
                  <div class="detail-item">
                    <i class="pi pi-hashtag text-surface-400"></i>
                    <span>Quantity: {{ request.requested_quantity }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="pi pi-users text-surface-400"></i>
                    <span>{{ request.class || 'No class specified' }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="pi pi-calendar text-surface-400"></i>
                    <span>{{ formatDate(request.timestamp) }}</span>
                  </div>
                </div>

                <!-- Expanded Content -->
                <div v-if="expandedRequestId === request.id" class="expanded-content">
                  <!-- Additional Request Details -->
                  <div class="additional-details">
                    <div v-if="request.description" class="detail-row">
                      <span class="detail-label">Description:</span>
                      <span class="detail-value">{{ request.description }}</span>
                    </div>
                    <div v-if="request.student_email" class="detail-row">
                      <span class="detail-label">Student Email:</span>
                      <span class="detail-value">{{ request.student_email }}</span>
                    </div>
                    <div v-if="request.status_reason" class="detail-row">
                      <span class="detail-label">Status Reason:</span>
                      <span class="detail-value">{{ request.status_reason }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Request ID:</span>
                      <span class="detail-value">{{ request.id }}</span>
                    </div>
                  </div>

                  <!-- Action Buttons for Pending Requests -->
                  <div v-if="request.status?.toLowerCase() === 'pending'" class="action-buttons">
                    <Button 
                      label="Cancel Request"
                      icon="pi pi-trash"
                      class="w-full"
                      @click.stop="openDeleteDialog(request)"
                      :loading="deletingRequest && requestToDelete?.id === request.id"
                      severity="danger"
                      size="small"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog 
      v-model:visible="showDeleteDialog" 
      :style="{ width: '450px' }" 
      header="Cancel Request"
      :modal="true"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem; color: #ef4444;"></i>
        <span>Are you sure you want to cancel this request? This action cannot be undone.</span>
      </div>
      
      <template #footer>
        <Button 
          label="No, Keep it" 
          icon="pi pi-times" 
          @click="showDeleteDialog = false" 
          class="p-button-text"
          severity="secondary"
        />
        <Button 
          label="Yes, Cancel Request" 
          icon="pi pi-trash" 
          @click="confirmDelete"
          autofocus
          :loading="deletingRequest"
          severity="danger"
        />
      </template>
    </Dialog>

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Badge from 'primevue/badge'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'

const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()
const apiUrl = config.public.API_URL || 'http://localhost:4000/api'

// Define page meta
definePageMeta({
  layout: 'default',
  middleware: 'auth',
  requiresAuth: true
})

// State
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const loading = ref(false)
const requests = ref([])
const activeTab = ref('all')
const requestToDelete = ref(null)
const showDeleteDialog = ref(false)
const deletingRequest = ref(false)
const expandedRequestId = ref(null)

// Tabs
const tabs = [
  { id: 'all', label: 'All Requests' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'declined', label: 'Declined' },
  { id: 'returned', label: 'Returned' }
]

// Computed properties
const userEmail = computed(() => user.value?.email || '')

// Filter requests by status - FIXED: Added proper computed properties
const pendingRequests = computed(() => 
  requests.value.filter(req => req.status?.toLowerCase() === 'pending')
)
const approvedRequests = computed(() => 
  requests.value.filter(req => req.status?.toLowerCase() === 'approved')
)
const declinedRequests = computed(() => 
  requests.value.filter(req => req.status?.toLowerCase() === 'declined')
)
const returnedRequests = computed(() => 
  requests.value.filter(req => req.status?.toLowerCase() === 'returned')
)

// Filtered requests based on active tab - FIXED: Added missing 'declined' case and proper returns
const filteredRequests = computed(() => {
  switch (activeTab.value) {
    case 'pending':
      return pendingRequests.value
    case 'approved':
      return approvedRequests.value
    case 'declined':
      return declinedRequests.value  // FIXED: Return the value
    case 'returned':
      return returnedRequests.value
    default:
      return requests.value
  }
})

// Toggle request expansion
const toggleRequestExpansion = (request) => {
  if (expandedRequestId.value === request.id) {
    expandedRequestId.value = null
  } else {
    expandedRequestId.value = request.id
  }
}

// Load requests
const loadRequests = async () => {
  loading.value = true
  try {
    const response = await fetch(`${apiUrl}/requests/${encodeURIComponent(userEmail.value)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // Sort by timestamp (newest first)
        requests.value = (data.data || []).sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )
        
        toast.add({
          severity: 'success',
          summary: 'Requests Loaded',
          detail: `Loaded ${requests.value.length} requests`,
          life: 3000
        })
      }
    } else {
      throw new Error('Failed to load requests')
    }
  } catch (error) {
    console.error('Error loading requests:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load requests',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Helper functions - FIXED: Added proper return values for all cases
const getRequestCount = (tabId) => {
  switch (tabId) {
    case 'pending': return pendingRequests.value.length
    case 'approved': return approvedRequests.value.length
    case 'declined': return declinedRequests.value.length  // FIXED: Use correct variable name
    case 'returned': return returnedRequests.value.length
    default: return requests.value.length
  }
}

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'in-stock'
    case 'pending': return 'low-stock'
    case 'declined': return 'out-of-stock'
    case 'returned': return 'returned-stock'
    default: return 'low-stock'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleImageError = (event) => {
  event.target.src = '/placeholder-image.png'
}

const openDeleteDialog = (request) => {
  if (request.status?.toLowerCase() !== 'pending') {
    toast.add({
      severity: 'info',
      summary: 'Cannot Cancel',
      detail: 'Only pending requests can be cancelled',
      life: 3000
    })
    return
  }
  requestToDelete.value = request
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!requestToDelete.value) return
  
  deletingRequest.value = true
  try {
    const response = await fetch(`${apiUrl}/requests/${requestToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      toast.add({
        severity: 'success',
        summary: 'Request Cancelled',
        detail: 'Your request has been cancelled successfully',
        life: 3000
      })
      
      // Remove from local state
      requests.value = requests.value.filter(
        req => req.id !== requestToDelete.value.id
      )
      
      // Update cart count if needed
      localStorage.setItem('cartCount', requests.value.length.toString())
      window.dispatchEvent(new CustomEvent('cart-updated'))
      
      // Close expanded view if the deleted request was expanded
      if (expandedRequestId.value === requestToDelete.value.id) {
        expandedRequestId.value = null
      }
    } else {
      throw new Error('Failed to cancel request')
    }
  } catch (error) {
    console.error('Error cancelling request:', error)
    toast.add({
      severity: 'error',
      summary: 'Cancel Failed',
      detail: 'Failed to cancel request',
      life: 5000
    })
  } finally {
    deletingRequest.value = false
    showDeleteDialog.value = false
    requestToDelete.value = null
  }
}

// Lifecycle
onMounted(() => {
  loadRequests()
  
  // Clear cart notification
  window.dispatchEvent(new CustomEvent('clear-cart-notification'))
  localStorage.setItem('cartCount', '0')
  
  // Listen for cart updates to refresh requests
  window.addEventListener('cart-updated', loadRequests)
})

// Cleanup
onUnmounted(() => {
  window.removeEventListener('cart-updated', loadRequests)
})
</script>

<style scoped>
.cart-view {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  box-sizing: border-box;
  padding: 1.5rem;
}

.header-section {
  margin-bottom: 2rem;
}

.filter-tabs {
  width: 100%;
}

.tab-button {
  white-space: nowrap;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.active-tab {
  font-weight: 600;
}

/* Product Grid Styles - Copied from Home.vue */
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
  text-transform: capitalize;
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

.stock-badge.returned-stock {
  background-color: #3b82f6;
}

.product-info {
  padding: 1rem;
}

.product-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.75rem;
  line-height: 1.3;
  padding-right: 2rem;
}

.cancel-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
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

.additional-details {
  background: #f1f5f9;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
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
  text-align: right;
}

.action-buttons {
  margin-top: 0.5rem;
}

/* Card styles */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
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

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* Summary Cards */
.summary-cards {
  margin-top: 2rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .cart-view {
    padding: 1rem;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .filter-tabs {
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
  
  .tab-button {
    font-size: 0.8rem;
    padding: 0.4rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-cards {
    grid-template-columns: 1fr 1fr !important;
  }
}
</style>