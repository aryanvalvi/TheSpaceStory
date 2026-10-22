// LocalStorage keys and helper functions for persistent Quotation drafts
const DRAFT_KEY_PREFIX = 'tss_quotation_draft_';

/**
 * Get the localStorage key for a quotation
 * @param {string} quotationId - 'new' or a MongoDB ObjectId string
 */
export function getDraftStorageKey(quotationId = 'new') {
  return `${DRAFT_KEY_PREFIX}${quotationId || 'new'}`;
}

/**
 * Save quotation draft to localStorage
 */
export function saveQuotationDraft(quotationId = 'new', quotation, activeRoomIndex = 0) {
  try {
    if (!quotation) return;
    const key = getDraftStorageKey(quotationId);
    const payload = {
      quotationId: quotationId || 'new',
      activeRoomIndex: activeRoomIndex ?? 0,
      quotation,
      lastModified: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));

    // Dispatch event so other components in the same window update in real time
    window.dispatchEvent(
      new CustomEvent('tss-draft-updated', {
        detail: { quotationId: quotationId || 'new', key, lastModified: payload.lastModified },
      })
    );
  } catch (err) {
    console.warn('Failed to save quotation draft to localStorage:', err);
  }
}

/**
 * Retrieve quotation draft from localStorage
 */
export function getQuotationDraft(quotationId = 'new') {
  try {
    const key = getDraftStorageKey(quotationId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.warn('Failed to parse quotation draft from localStorage:', err);
    return null;
  }
}

/**
 * Clear a specific quotation draft from localStorage
 */
export function clearQuotationDraft(quotationId = 'new') {
  try {
    const key = getDraftStorageKey(quotationId);
    localStorage.removeItem(key);

    // If clearing 'new', also ensure any other legacy key is removed
    if (quotationId === 'new') {
      localStorage.removeItem('tss_editing_project_id');
    }

    window.dispatchEvent(
      new CustomEvent('tss-draft-updated', {
        detail: { quotationId: quotationId || 'new', key, cleared: true },
      })
    );
  } catch (err) {
    console.warn('Failed to clear quotation draft from localStorage:', err);
  }
}

/**
 * Determine if a draft contains user additions or modifications worth keeping
 */
export function isDraftMeaningful(draft) {
  if (!draft || !draft.quotation) return false;
  const q = draft.quotation;

  const totalItems = (q.rooms || []).reduce((acc, r) => acc + (r.items?.length || 0), 0);
  if (totalItems > 0) return true;
  const validRooms = (q.rooms || []).filter(
    (r) => r.name !== 'Master Bedroom' || (r.items && r.items.length > 0)
  );
  if (validRooms.length > 0) return true;
  if (q.projectId && q.projectId.trim() !== '') return true;
  if ((q.additionalCharges || []).length > 0) return true;
  if (q.discountConfig?.type && q.discountConfig.type !== 'none' && Number(q.discountConfig.value) > 0) {
    return true;
  }
  return false;
}

/**
 * Get metadata about the active 'new' draft if one exists
 */
export function getActiveDraftSummary() {
  const draft = getQuotationDraft('new');
  if (!draft || !isDraftMeaningful(draft)) return null;

  const q = draft.quotation;
  const totalItems = (q.rooms || []).reduce((acc, r) => acc + (r.items?.length || 0), 0);
  const roomsCount = (q.rooms || []).length;

  return {
    quotationId: draft.quotationId,
    projectId: q.projectId,
    totalItems,
    roomsCount,
    lastModified: draft.lastModified,
    grandTotal: q.calculationSnapshot?.grandTotal || 0,
  };
}
