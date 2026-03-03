<template>
  <div class="cart-view">
    <div class="main-container">
      <div class="content-wrapper">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">My Requests</h1>
          <p class="page-subtitle">View all your submitted requests</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          <p>Loading requests...</p>
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Tabs for filtering -->
          <div class="card tabs-card">
            <div class="tabs-container">
              <Button 
                v-for="tab in tabs" 
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'tab-button',
                  { 'active-tab': activeTab === tab.id }
                ]"
              >
                <span class="tab-label">{{ tab.label }}</span>
                <Badge 
                  :value="getRequestCount(tab.id)" 
                  :severity="activeTab === tab.id ? 'primary' : 'secondary'"
                  class="tab-badge"
                />
              </Button>
            </div>
          </div>

          <!-- No Requests Message -->
          <div v-if="filteredRequests.length === 0" class="empty-state">
            <div class="empty-state-content">
              <i class="pi pi-inbox empty-icon"></i>
              <h3>No Requests Found</h3>
              <p>You haven't submitted any requests yet.</p>
              <Button 
                label="Browse Inventory"
                icon="pi pi-box"
                class="empty-state-btn primary-gradient"
                @click="router.push('/home')"
              />
            </div>
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
                <div class="status-badge" :class="getStatusClass(request.status)">
                  <i :class="getStatusIcon(request.status)"></i>
                  {{ request.status || 'pending' }}
                </div>
              </div>

              <!-- Product Info -->
              <div class="product-info">
                <div class="product-header">
                  <h3 class="product-title">{{ request.model || 'Unknown Item' }}</h3>
                </div>
                
                <!-- Request Details -->
                <div class="product-details">
                  <div class="detail-item">
                    <i class="pi pi-hashtag detail-icon"></i>
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">{{ request.requested_quantity }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="pi pi-users detail-icon"></i>
                    <span class="detail-label">Class:</span>
                    <span class="detail-value">{{ request.class || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="pi pi-calendar detail-icon"></i>
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">{{ formatDate(request.timestamp) }}</span>
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
                    <div class="detail-row">
                      <span class="detail-label">Student Email:</span>
                      <span class="detail-value">{{ request.student_email }}</span>
                    </div>
                    <div v-if="request.status_reason" class="detail-row">
                      <span class="detail-label">Status Reason:</span>
                      <span class="detail-value">{{ request.status_reason }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Request ID:</span>
                      <span class="detail-value request-id">{{ request.id }}</span>
                    </div>
                  </div>

                  <!-- Action Buttons for Pending Requests -->
                  <div v-if="request.status?.toLowerCase() === 'pending'" class="action-section">
                    <Button 
                      label="Cancel Request"
                      icon="pi pi-trash"
                      class="cancel-button"
                      @click.stop="openDeleteDialog(request)"
                      :loading="deletingRequest && requestToDelete?.id === request.id"
                      severity="danger"
                      outlined
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
      class="custom-dialog"
    >
      <div class="confirmation-content">
        <div class="warning-icon-container">
          <i class="pi pi-exclamation-triangle warning-icon"></i>
        </div>
        <div class="confirmation-message">
          <h4>Are you sure?</h4>
          <p>This action cannot be undone. The request will be permanently cancelled.</p>
        </div>
      </div>
      
      <template #footer>
        <Button 
          label="No, Keep it" 
          icon="pi pi-times" 
          @click="showDeleteDialog = false" 
          class="dialog-btn cancel-btn"
          text
        />
        <Button 
          label="Yes, Cancel Request" 
          icon="pi pi-trash" 
          @click="confirmDelete"
          :loading="deletingRequest"
          class="dialog-btn delete-btn"
        />
      </template>
    </Dialog>

    <Toast position="top-right" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()

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

const filteredRequests = computed(() => {
  switch (activeTab.value) {
    case 'pending':
      return pendingRequests.value
    case 'approved':
      return approvedRequests.value
    case 'declined':
      return declinedRequests.value
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
    const response = await fetch(`api/requests/${encodeURIComponent(userEmail.value)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        requests.value = (data.data || []).sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )
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

// Helper functions
const getRequestCount = (tabId) => {
  switch (tabId) {
    case 'pending': return pendingRequests.value.length
    case 'approved': return approvedRequests.value.length
    case 'declined': return declinedRequests.value.length
    case 'returned': return returnedRequests.value.length
    default: return requests.value.length
  }
}

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'status-approved'
    case 'pending': return 'status-pending'
    case 'declined': return 'status-declined'
    case 'returned': return 'status-returned'
    default: return 'status-pending'
  }
}

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'pi pi-check-circle'
    case 'pending': return 'pi pi-clock'
    case 'declined': return 'pi pi-times-circle'
    case 'returned': return 'pi pi-undo'
    default: return 'pi pi-clock'
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
    const response = await fetch(`api/requests/${requestToDelete.value.id}`, {
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
      
      requests.value = requests.value.filter(
        req => req.id !== requestToDelete.value.id
      )
      
      localStorage.setItem('cartCount', requests.value.length.toString())
      window.dispatchEvent(new CustomEvent('cart-updated'))
      
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
  
  window.dispatchEvent(new CustomEvent('clear-cart-notification'))
  localStorage.setItem('cartCount', '0')
  
  window.addEventListener('cart-updated', loadRequests)
})

onUnmounted(() => {
  window.removeEventListener('cart-updated', loadRequests)
})
</script>

<style scoped>
.cart-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.main-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
}

.content-wrapper {
  max-width: 1800px;
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

/* Tabs Card */
.tabs-card {
  margin-bottom: 2rem;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tabs-container {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  background: #f8f9fa;
  color: #64748b;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
}

.tab-button:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
}

.tab-button.active-tab {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab-label {
  font-size: 0.95rem;
}

.tab-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.tab-button.active-tab .tab-badge :deep(.p-badge) {
  background: white;
  color: #667eea;
}

/* Product Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.product-card.expanded {
  border-color: #667eea;
  background: #f8fafc;
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

/* Status Badge */
.status-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  text-transform: capitalize;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-badge.status-approved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.status-badge.status-pending {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.status-badge.status-declined {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.status-badge.status-returned {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.status-badge i {
  font-size: 0.9rem;
}

/* Product Info */
.product-info {
  padding: 1.5rem;
}

.product-header {
  margin-bottom: 1rem;
}

.product-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #64748b;
}

.detail-icon {
  color: #667eea;
  font-size: 0.9rem;
  width: 1.2rem;
}

.detail-label {
  font-weight: 500;
  min-width: 70px;
}

.detail-value {
  color: #334155;
  font-weight: 500;
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
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-row .detail-label {
  color: #64748b;
  font-weight: 500;
  min-width: 100px;
}

.detail-row .detail-value {
  color: #334155;
  text-align: right;
  word-break: break-word;
}

.request-id {
  font-family: monospace;
  font-size: 0.75rem;
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.action-section {
  display: flex;
  justify-content: flex-end;
}

.cancel-button {
  width: 100%;
  border: 2px solid #ef4444;
  color: #ef4444;
  font-weight: 600;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #ef4444;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-state p {
  margin-top: 1rem;
  color: #64748b;
  font-size: 1rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem;
  background: white;
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
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #64748b;
  margin-bottom: 1.5rem;
}

.empty-state-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  padding: 0.75rem 2rem;
  font-weight: 600;
}

.empty-state-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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
}

.confirmation-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.warning-icon-container {
  flex-shrink: 0;
}

.warning-icon {
  font-size: 2rem;
  color: #ef4444;
}

.confirmation-message h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 600;
}

.confirmation-message p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.5;
}

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

.dialog-btn.delete-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
}

.dialog-btn.delete-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Responsive Design */
@media (max-width: 900px) {
  .cart-view {
    padding: 1rem;
  }
  
  .main-container {
    padding: 1rem;
  }
  
  .tabs-container {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    justify-content: flex-start;
  }
  
  .tab-button {
    flex-shrink: 0;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .product-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .detail-row .detail-label {
    min-width: auto;
  }
  
  .detail-row .detail-value {
    text-align: left;
  }
  
  .confirmation-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .header-section {
    padding: 0.75rem;
  }
  
  .tabs-card {
    padding: 0.75rem;
  }
  
  .tab-button {
    padding: 0.5rem 1rem;
  }
  
  .tab-label {
    font-size: 0.85rem;
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
  
  .loading-state {
    padding: 2rem 1rem;
  }
}
</style>