import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type CartItemDecision = 'approve' | 'decline'

export interface DraftItem {
  requestId: string
  decision: CartItemDecision
  approvedQuantity: number
}

export const useTechnicianCartStore = defineStore('technicianCart', () => {
  const draftByRequestId = ref<Record<string, DraftItem>>({})

  const draftItems = computed(() => Object.values(draftByRequestId.value))

  const setDraft = (requestId: string, item: DraftItem) => {
    draftByRequestId.value = {
      ...draftByRequestId.value,
      [requestId]: item,
    }
  }

  const getDraft = (requestId: string): DraftItem | undefined => {
    return draftByRequestId.value[requestId]
  }

  const clearDraftsForUser = (requestIds: string[]) => {
    const next = { ...draftByRequestId.value }
    requestIds.forEach((id) => delete next[id])
    draftByRequestId.value = next
  }

  const clearAll = () => {
    draftByRequestId.value = {}
  }

  return {
    draftByRequestId,
    draftItems,
    setDraft,
    getDraft,
    clearDraftsForUser,
    clearAll,
  }
})
