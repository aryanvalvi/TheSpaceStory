import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
  saveQuotationDraft,
  getQuotationDraft,
  clearQuotationDraft,
  isDraftMeaningful,
} from '../../lib/quotationDraftStorage';
import {
  formatINR,
  toINR,
  toPaise,
  formatDate,
  calculateLocalQuantity,
  CALCULATION_METHOD_LABELS,
  UNIT_LABELS,
} from '../../lib/utils';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Copy,
  Printer,
  Sparkles,
  Layers,
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import QuotationPrintStudio from './QuotationPrintStudio';

export default function QuotationEditor({ quotationId, initialProjectId, onBack, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Draft persistence state
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [projectConflict, setProjectConflict] = useState(null);
  const hasInitializedRef = useRef(false);

  // Dropdown options
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalogueItems, setCatalogueItems] = useState([]);
  const [catalogueModalOpen, setCatalogueModalOpen] = useState(false);
  const [showPrintStudio, setShowPrintStudio] = useState(false);
  const [studioSettings, setStudioSettings] = useState(null);
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  // Main Quotation Form State
  const [quotation, setQuotation] = useState({
    quotationNumber: 'Draft',
    revisionNumber: 1,
    status: 'draft',
    projectId: '',
    version: 1,
    rooms: [],
    designFees: [
      {
        description: 'Interior Designer Professional Fees',
        feeType: 'per_sqft',
        sqft: '',
        ratePerSqft: '',
        amount: 0,
        calculatedAmount: 0,
        isTaxable: true,
      },
    ],
    additionalCharges: [],
    discountConfig: {
      type: 'none',
      value: 0,
      calculatedAmount: 0,
    },
    taxConfig: {
      enabled: false,
      type: 'exclusive',
      rate: 18,
      isInterState: false,
    },
    paymentMilestones: [
      { description: 'Booking advance', percentage: 20, amount: 0 },
      { description: 'Carcass fabrication & procurement', percentage: 40, amount: 0 },
      { description: 'On-site installation & finishes', percentage: 30, amount: 0 },
      { description: 'Snagging & handover', percentage: 10, amount: 0 },
    ],
    terms: [],
    inclusions: [],
    exclusions: [],
    calculationSnapshot: {
      roomsSubtotal: 0,
      designFeesTotal: 0,
      subtotalBeforeDiscount: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
      taxableAmount: 0,
      taxAmount: 0,
      cgst: 0,
      sgst: 0,
      grandTotal: 0,
    },
  });

  const [activeRoomIndex, setActiveRoomIndex] = useState(0);

  useEffect(() => {
    initData();
  }, [quotationId, initialProjectId]);

  async function initData(forceFresh = false) {
    try {
      setLoading(true);
      hasInitializedRef.current = false;
      const [pData, cData, catData, sData] = await Promise.all([
        api.getProjects({ limit: 100 }),
        api.getClients({ limit: 100 }),
        api.getCatalogue({ limit: 200 }),
        api.getStudioSettings().catch(() => null),
      ]);

      const loadedProjects = Array.isArray(pData) ? pData : pData.data || [];
      const loadedClients = Array.isArray(cData) ? cData : cData.data || [];
      const loadedCatalogue = Array.isArray(catData) ? catData : catData.data || [];

      setProjects(loadedProjects);
      setClients(loadedClients);
      setCatalogueItems(loadedCatalogue);
      if (sData) setStudioSettings(sData);

      if (quotationId && quotationId !== 'new') {
        const q = await api.getQuotation(quotationId);
        const serverQuotation = {
          ...q,
          projectId: typeof q.projectId === 'object' ? q.projectId?._id : q.projectId,
        };

        const localDraft = !forceFresh ? getQuotationDraft(quotationId) : null;
        if (localDraft && localDraft.quotation) {
          setQuotation(localDraft.quotation);
          if (typeof localDraft.activeRoomIndex === 'number') {
            setActiveRoomIndex(localDraft.activeRoomIndex);
          }
          setIsDraftRestored(true);
          setLastSavedTime(localDraft.lastModified ? new Date(localDraft.lastModified) : new Date());
        } else {
          setQuotation(serverQuotation);
          setIsDraftRestored(false);
        }
      } else {
        // quotationId === 'new'
        const localDraft = !forceFresh ? getQuotationDraft('new') : null;
        if (localDraft && localDraft.quotation && isDraftMeaningful(localDraft)) {
          const draftProject = localDraft.quotation.projectId;
          // Check if there is a conflict between draft and requested project
          if (initialProjectId && draftProject && initialProjectId !== draftProject) {
            setProjectConflict({
              draftProjectId: draftProject,
              requestedProjectId: initialProjectId,
            });
          } else {
            setProjectConflict(null);
          }

          let restoredRooms = localDraft.quotation.rooms || [];
          // If the draft contains only a default empty 'Master Bedroom', clean it out
          if (
            restoredRooms.length === 1 &&
            restoredRooms[0]?.name === 'Master Bedroom' &&
            (!restoredRooms[0].items || restoredRooms[0].items.length === 0)
          ) {
            restoredRooms = [];
          }

          let restoredFees = localDraft.quotation.designFees;
          if (
            !restoredFees ||
            restoredFees.length === 0 ||
            (restoredFees.length === 1 &&
              restoredFees[0].description === 'Design & Architectural Supervision' &&
              (!restoredFees[0].amount || restoredFees[0].amount === 0))
          ) {
            restoredFees = [
              {
                description: 'Interior Designer Professional Fees',
                feeType: 'per_sqft',
                sqft: '',
                ratePerSqft: '',
                amount: 0,
                calculatedAmount: 0,
                isTaxable: true,
              },
            ];
          }

          setQuotation({
            ...localDraft.quotation,
            rooms: restoredRooms,
            designFees: restoredFees,
            projectId: draftProject || initialProjectId || loadedProjects[0]?._id || '',
          });
          if (typeof localDraft.activeRoomIndex === 'number') {
            setActiveRoomIndex(localDraft.activeRoomIndex);
          }
          setIsDraftRestored(true);
          setLastSavedTime(localDraft.lastModified ? new Date(localDraft.lastModified) : new Date());
        } else {
          // Fresh initial defaults
          setIsDraftRestored(false);
          setProjectConflict(null);
          setQuotation((prev) => ({
            ...prev,
            rooms: [],
            designFees: [
              {
                description: 'Interior Designer Professional Fees',
                feeType: 'per_sqft',
                sqft: '',
                ratePerSqft: '',
                amount: 0,
                calculatedAmount: 0,
                isTaxable: true,
              },
            ],
            projectId: initialProjectId || loadedProjects[0]?._id || '',
            terms: sData?.defaultTerms || [],
            taxConfig: {
              enabled: false,
              type: 'exclusive',
              rate: 18,
              isInterState: false,
            },
            inclusions: sData?.defaultInclusions || [],
            exclusions: sData?.defaultExclusions || [],
            paymentMilestones: (sData?.defaultPaymentMilestones || []).map((m) => ({
              description: m.description,
              percentage: m.percentage,
              amount: 0,
            })),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to initialize editor:', err);
      setError(err.message || 'Error loading quotation');
    } finally {
      setLoading(false);
      setTimeout(() => {
        hasInitializedRef.current = true;
      }, 200);
    }
  }

  // Auto-save draft to localStorage whenever quotation or active room changes
  useEffect(() => {
    const isReadonlyStatus = ['issued', 'approved', 'rejected', 'cancelled'].includes(quotation.status);
    if (!hasInitializedRef.current || loading || isReadonlyStatus) return;

    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      saveQuotationDraft(quotationId || 'new', quotation, activeRoomIndex);
      setLastSavedTime(new Date());
      setAutoSaveStatus('saved');
    }, 300);

    return () => clearTimeout(timer);
  }, [quotation, activeRoomIndex, quotationId, loading]);

  // Synchronously save before window closes or refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const isReadonlyStatus = ['issued', 'approved', 'rejected', 'cancelled'].includes(quotation.status);
      if (hasInitializedRef.current && !loading && !isReadonlyStatus) {
        saveQuotationDraft(quotationId || 'new', quotation, activeRoomIndex);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [quotation, activeRoomIndex, quotationId, loading]);

  const handleDiscardDraft = () => {
    if (
      !confirm(
        'Discard all unsaved local changes and start fresh? All items in this local draft will be cleared.'
      )
    ) {
      return;
    }
    clearQuotationDraft(quotationId || 'new');
    setIsDraftRestored(false);
    setProjectConflict(null);
    initData(true);
  };

  // Recalculate quotation with financial engine whenever rooms, fees, taxes change
  useEffect(() => {
    if (!loading && quotation.rooms?.length) {
      runCalculationPreview();
    }
  }, [
    JSON.stringify(quotation.rooms),
    JSON.stringify(quotation.designFees),
    JSON.stringify(quotation.additionalCharges),
    JSON.stringify(quotation.discountConfig),
    JSON.stringify(quotation.taxConfig),
    JSON.stringify(quotation.paymentMilestones),
  ]);

  const getSanitizedPayload = (targetQuotation = quotation) => {
    return {
      ...targetQuotation,
      rooms: (targetQuotation.rooms || []).map((r, ri) => ({
        ...r,
        roomId: r.roomId || `room-${Date.now()}-${ri}`,
        name: r.name?.trim() || `Room ${ri + 1}`,
        subtotal: Number(r.subtotal) || 0,
        items: (r.items || []).map((it, ii) => {
          const cleanDims = {};
          if (it.dimensions && typeof it.dimensions === 'object') {
            ['length', 'width', 'height', 'count', 'perUnit'].forEach((k) => {
              const val = it.dimensions[k];
              if (val !== '' && val !== null && val !== undefined && !isNaN(Number(val))) {
                cleanDims[k] = Number(val);
              }
            });
          }
          return {
            ...it,
            itemId: it.itemId || `item-${Date.now()}-${ii}`,
            name: it.name?.trim() || 'Untitled Item',
            unit: it.unit || 'sqft',
            quantity: it.quantity === '' || isNaN(Number(it.quantity)) ? 0 : Number(it.quantity),
            rate: it.rate === '' || isNaN(Number(it.rate)) ? 0 : Number(it.rate),
            amount: Number(it.amount) || 0,
            dimensions: Object.keys(cleanDims).length > 0 ? cleanDims : undefined,
            calculationMethod: (['piece', 'set', 'nos'].includes(it.unit) || it.calculationMethod === 'manual')
              ? 'manual'
              : (it.calculationMethod || 'manual'),
            isOptional: Boolean(it.isOptional),
            isIncluded: it.isIncluded !== false,
          };
        }),
      })),
      designFees: (targetQuotation.designFees || []).map((f) => {
        const sq = f.sqft !== '' && f.sqft !== null && f.sqft !== undefined && !isNaN(Number(f.sqft))
          ? Number(f.sqft)
          : undefined;
        const rate = f.ratePerSqft !== '' && f.ratePerSqft !== null && f.ratePerSqft !== undefined && !isNaN(Number(f.ratePerSqft))
          ? Number(f.ratePerSqft)
          : undefined;
        const amt = Number(f.amount) || (sq && rate ? Math.round(sq * rate) : 0);
        return {
          description: f.description?.trim() || 'Interior Designer Professional Fees',
          feeType: f.feeType || 'per_sqft',
          amount: amt,
          sqft: sq,
          ratePerSqft: rate,
          calculatedAmount: Number(f.calculatedAmount) || amt,
          isTaxable: f.isTaxable !== false,
        };
      }),
      discountConfig: {
        type: targetQuotation.discountConfig?.type || 'none',
        value: targetQuotation.discountConfig?.value ? Number(targetQuotation.discountConfig.value) : 0,
        calculatedAmount: targetQuotation.discountConfig?.calculatedAmount || 0,
      },
      taxConfig: {
        enabled: Boolean(targetQuotation.taxConfig?.enabled),
        type: targetQuotation.taxConfig?.type || 'exclusive',
        rate: Number(targetQuotation.taxConfig?.rate) || 18,
        isInterState: Boolean(targetQuotation.taxConfig?.isInterState),
      },
    };
  };

  async function runCalculationPreview() {
    try {
      const sanitized = getSanitizedPayload();
      const calcPayload = {
        rooms: sanitized.rooms.map((r) => ({
          roomId: r.roomId,
          name: r.name,
          items: r.items.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            unit: i.unit,
            quantity: i.quantity,
            rate: i.rate,
            dimensions: i.dimensions,
            calculationMethod: i.calculationMethod,
            isOptional: i.isOptional,
            isIncluded: i.isIncluded,
          })),
        })),
        designFees: sanitized.designFees,
        additionalCharges: quotation.additionalCharges,
        discountConfig: sanitized.discountConfig,
        taxConfig: quotation.taxConfig,
        paymentMilestones: quotation.paymentMilestones,
        carpetAreaSqFt: quotation.carpetAreaSqFt ? Number(quotation.carpetAreaSqFt) : undefined,
      };

      const result = await api.calculateQuotation(calcPayload);
      if (result) {
        setQuotation((prev) => {
          // Update room subtotals and item amounts from calculation engine
          const updatedRooms = prev.rooms.map((room, rIdx) => {
            const calcRoom = result.rooms?.[rIdx];
            return {
              ...room,
              subtotal: calcRoom?.subtotal ?? room.subtotal,
              items: room.items.map((item, iIdx) => {
                const calcItem = calcRoom?.items?.[iIdx];
                return {
                  ...item,
                  amount: calcItem?.amount ?? item.amount,
                };
              }),
            };
          });

          // Sync calculated amounts back onto fees while preserving user input
          const updatedDesignFees = (prev.designFees || []).map((fee, idx) => {
            const calcFee = result.designFees?.[idx];
            return {
              ...fee,
              calculatedAmount: calcFee?.calculatedAmount ?? fee.calculatedAmount ?? fee.amount ?? 0,
            };
          });

          return {
            ...prev,
            rooms: updatedRooms,
            designFees: updatedDesignFees,
            calculationSnapshot: result.calculationSnapshot,
            paymentMilestones: result.paymentMilestones || prev.paymentMilestones,
          };
        });
      }
    } catch (err) {
      // client-side silent fallback if network is slow
    }
  }

  // Room tab handlers
  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    const newRoom = {
      roomId: `room-${Date.now()}`,
      name: newRoomName.trim(),
      items: [],
      subtotal: 0,
    };
    setQuotation((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));
    setActiveRoomIndex(quotation.rooms.length);
    setNewRoomName('');
    setNewRoomModalOpen(false);
  };

  const handleDeleteRoom = (index) => {
    const roomName = quotation.rooms[index]?.name || 'Room';
    if (!confirm(`Delete "${roomName}" and all its items?`)) return;
    const updated = quotation.rooms.filter((_, i) => i !== index);
    setQuotation({ ...quotation, rooms: updated });
    if (activeRoomIndex >= updated.length) {
      setActiveRoomIndex(Math.max(0, updated.length - 1));
    }
  };

  // Line item handlers
  const handleAddItemFromCatalogue = (catItem) => {
    if (!quotation.rooms.length) {
      alert('Please add a room first before inserting items.');
      setCatalogueModalOpen(false);
      setNewRoomModalOpen(true);
      return;
    }
    const targetRoomIndex = activeRoomIndex < quotation.rooms.length ? activeRoomIndex : 0;
    const newItem = {
      itemId: `item-${Date.now()}`,
      catalogueItemId: catItem._id,
      name: catItem.name,
      description: catItem.description || '',
      specifications: catItem.defaultSpecifications || '',
      unit: catItem.defaultUnit || 'piece',
      calculationMethod: catItem.defaultQuantityFormula || 'manual',
      dimensions: { length: 0, width: 0, height: 0, count: 1, perUnit: 1 },
      quantity: 1,
      rate: catItem.defaultRate,
      amount: catItem.defaultRate,
      isOptional: false,
      isIncluded: true,
      order: quotation.rooms[targetRoomIndex]?.items.length || 0,
    };

    // Calculate initial quantity only if not manual and dimensions are provided
    if (newItem.calculationMethod !== 'manual' && (newItem.dimensions.length || newItem.dimensions.width)) {
      newItem.quantity = calculateLocalQuantity(
        newItem.calculationMethod,
        newItem.dimensions,
        1
      );
    }
    newItem.amount = Math.round((Number(newItem.quantity) || 1) * (newItem.rate || 0));

    const rooms = [...quotation.rooms];
    rooms[targetRoomIndex].items.push(newItem);
    setQuotation({ ...quotation, rooms });
    setCatalogueModalOpen(false);
  };

  const handleAddCustomItem = () => {
    if (!quotation.rooms.length) {
      alert('Please add a room first before creating items.');
      setNewRoomModalOpen(true);
      return;
    }
    const targetRoomIndex = activeRoomIndex < quotation.rooms.length ? activeRoomIndex : 0;
    const newItemId = `item-${Date.now()}`;
    const newItem = {
      itemId: newItemId,
      name: '',
      description: '',
      specifications: '',
      unit: 'sqft',
      calculationMethod: 'length_x_width',
      dimensions: { length: '', width: '', height: '', count: '', perUnit: '' },
      quantity: '',
      rate: '',
      amount: 0,
      isOptional: false,
      isIncluded: true,
      order: quotation.rooms[targetRoomIndex]?.items.length || 0,
    };

    const rooms = [...quotation.rooms];
    rooms[targetRoomIndex].items.push(newItem);
    setQuotation({ ...quotation, rooms });

    // Auto-focus on the newly created item's name input
    setTimeout(() => {
      const inputEl = document.getElementById(`item-name-${newItemId}`);
      if (inputEl) {
        inputEl.focus();
      }
    }, 60);
  };

  const handleUpdateItem = (itemIndex, field, value) => {
    const rooms = [...quotation.rooms];
    const item = { ...rooms[activeRoomIndex].items[itemIndex] };

    if (field === 'rateINR') {
      const val = value === '' ? '' : value;
      item.rate = val === '' ? '' : toPaise(val);
      item.amount = Math.round((Number(item.quantity) || 0) * (Number(item.rate) ? item.rate : 0));
    } else if (field.startsWith('dimensions.')) {
      const dimField = field.split('.')[1];
      const newDimensions = {
        ...item.dimensions,
        [dimField]: value === '' ? '' : Number(value),
      };
      item.dimensions = newDimensions;
      if (item.calculationMethod && item.calculationMethod !== 'manual') {
        const calculated = calculateLocalQuantity(item.calculationMethod, newDimensions, item.quantity);
        item.quantity = calculated > 0 ? calculated : '';
      }
      item.amount = Math.round((Number(item.quantity) || 0) * (Number(item.rate) ? item.rate : 0));
    } else if (field === 'calculationMethod') {
      item.calculationMethod = value;
      if (value !== 'manual') {
        item.unit = 'sqft';
        const calculated = calculateLocalQuantity(value, item.dimensions, item.quantity);
        item.quantity = calculated > 0 ? calculated : '';
      }
      item.amount = Math.round((Number(item.quantity) || 0) * (Number(item.rate) ? item.rate : 0));
    } else if (field === 'unit') {
      item.unit = value;
      if (['piece', 'set', 'nos'].includes(value)) {
        item.calculationMethod = 'manual';
      } else if (['sqft', 'sqm'].includes(value) && item.calculationMethod === 'manual') {
        item.calculationMethod = 'length_x_width';
      }
      item.amount = Math.round((Number(item.quantity) || 0) * (Number(item.rate) ? item.rate : 0));
    } else if (field === 'quantity') {
      item.quantity = value === '' ? '' : Number(value);
      item.amount = Math.round((Number(item.quantity) || 0) * (Number(item.rate) ? item.rate : 0));
    } else {
      item[field] = value;
    }

    rooms[activeRoomIndex].items[itemIndex] = item;
    setQuotation({ ...quotation, rooms });
  };

  const handleDeleteItem = (itemIndex) => {
    const rooms = [...quotation.rooms];
    rooms[activeRoomIndex].items.splice(itemIndex, 1);
    setQuotation({ ...quotation, rooms });
  };

  const handleDuplicateItem = (itemIndex) => {
    const rooms = [...quotation.rooms];
    const item = rooms[activeRoomIndex].items[itemIndex];
    const duplicated = {
      ...item,
      itemId: `item-${Date.now()}`,
      name: `${item.name} (Copy)`,
    };
    rooms[activeRoomIndex].items.splice(itemIndex + 1, 0, duplicated);
    setQuotation({ ...quotation, rooms });
  };

  const handleAddDesignFee = () => {
    const newFee = {
      description: (!quotation.designFees || quotation.designFees.length === 0)
        ? 'Interior Designer Professional Fees'
        : 'Architectural Fees',
      feeType: 'per_sqft',
      sqft: '',
      ratePerSqft: '',
      amount: 0,
      calculatedAmount: 0,
      isTaxable: true,
    };
    setQuotation((prev) => ({
      ...prev,
      designFees: [...(prev.designFees || []), newFee],
    }));
  };

  const handleRemoveDesignFee = (index) => {
    setQuotation((prev) => {
      const updated = (prev.designFees || []).filter((_, i) => i !== index);
      return {
        ...prev,
        designFees: updated,
      };
    });
  };

  const handleUpdateDesignFee = (index, updates) => {
    setQuotation((prev) => {
      const fees = [...(prev.designFees || [])];
      const current = { ...(fees[index] || {}) };
      const merged = { ...current, ...updates };

      // Calculate amount based on feeType
      if (merged.feeType === 'per_sqft') {
        const sq = Number(merged.sqft) || 0;
        const ratePaise = Number(merged.ratePerSqft) || 0; // in paise
        merged.amount = Math.round(sq * ratePaise);
        merged.calculatedAmount = merged.amount;
      } else if (merged.feeType === 'fixed') {
        merged.amount = Number(merged.amount) || 0;
        merged.calculatedAmount = merged.amount;
      } else if (merged.feeType === 'percentage') {
        const roomsSubtotal = (prev.rooms || []).reduce((sum, r) => sum + (r.subtotal || 0), 0);
        const pct = merged.amount > 100 ? merged.amount / 100 : merged.amount;
        merged.calculatedAmount = Math.round((roomsSubtotal * pct) / 100);
      }

      fees[index] = merged;
      return {
        ...prev,
        designFees: fees,
      };
    });
  };

  // Save quotation (Create or Update Draft)
  const handleSaveDraft = async () => {
    if (!quotation.projectId) {
      setError('Please select a project before saving');
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = getSanitizedPayload();
      let saved;
      if (quotation._id) {
        saved = await api.updateQuotation(quotation._id, {
          ...payload,
          version: quotation.version,
        });
        clearQuotationDraft(quotation._id);
      } else {
        saved = await api.createQuotation(payload);
        clearQuotationDraft('new');
      }
      clearQuotationDraft(saved._id);
      setIsDraftRestored(false);
      setQuotation((prev) => ({
        ...prev,
        ...saved,
        version: saved.version || prev.version + 1,
      }));
      setSuccessMsg('Quotation saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      if (onSaved) onSaved(saved);
    } catch (err) {
      setError(err.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  // Issue Quotation
  const handleIssue = async () => {
    if (!confirm('Issue quotation? Issued quotations become permanently frozen snapshots.')) return;
    setSaving(true);
    setError('');
    try {
      const payload = getSanitizedPayload();
      // Save current changes first if draft
      if (quotation._id) {
        await api.updateQuotation(quotation._id, { ...payload, version: quotation.version });
        const issued = await api.issueQuotation(quotation._id);
        clearQuotationDraft(quotation._id);
        clearQuotationDraft('new');
        setIsDraftRestored(false);
        setQuotation(issued);
        setSuccessMsg('Quotation issued successfully!');
      } else {
        const saved = await api.createQuotation(payload);
        const issued = await api.issueQuotation(saved._id);
        clearQuotationDraft('new');
        clearQuotationDraft(saved._id);
        setIsDraftRestored(false);
        setQuotation(issued);
        setSuccessMsg('Quotation issued successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to issue quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPrintStudio = async () => {
    if (!isReadonly && isDraftMeaningful(quotation)) {
      if (!quotation.projectId) {
        setError('Please select an Associated Project before previewing or printing');
        return;
      }
      try {
        await handleSaveDraft();
      } catch (e) {
        console.warn('Could not auto-save before opening print studio:', e);
      }
    }
    setShowPrintStudio(true);
  };

  const handleRevise = async () => {
    if (!confirm('Create a new revision from this quotation?')) return;
    setSaving(true);
    try {
      const newRev = await api.createRevision(quotation._id);
      setQuotation(newRev);
      setSuccessMsg(`Created Revision ${newRev.revisionNumber}! All fields are now editable.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create revision');
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm('Reopen this quotation back to Draft? This will unlock all fields so you can edit and save directly.')) return;
    setSaving(true);
    try {
      const reopened = await api.reopenQuotation(quotation._id);
      setQuotation(reopened);
      setSuccessMsg('Quotation unlocked! All fields are now fully editable.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to unlock quotation');
    } finally {
      setSaving(false);
    }
  };

  const isIssued = quotation.status === 'issued';
  const isReadonly = ['issued', 'approved', 'rejected', 'cancelled'].includes(quotation.status);

  const currentRoom = quotation.rooms?.[activeRoomIndex] || quotation.rooms?.[0] || null;

  // Real-time financial calculations with synchronized fallback
  const rawCalc = quotation.calculationSnapshot || {};
  const computedDesignFeesTotal = (quotation.designFees || []).reduce(
    (sum, f) => sum + (Number(f.calculatedAmount) || Number(f.amount) || 0),
    0
  );
  const computedRoomsSubtotal = (quotation.rooms || []).reduce(
    (sum, r) => sum + (Number(r.subtotal) || 0),
    0
  );

  const roomsSubtotal = rawCalc.roomsSubtotal ?? computedRoomsSubtotal;
  const designFeesTotal = (rawCalc.designFeesTotal !== undefined && rawCalc.designFeesTotal > 0)
    ? rawCalc.designFeesTotal
    : computedDesignFeesTotal;

  const additionalChargesTotal = rawCalc.additionalChargesTotal ?? 0;
  const subtotalBeforeDiscount = rawCalc.subtotalBeforeDiscount ?? (roomsSubtotal + designFeesTotal + additionalChargesTotal);

  let discountAmount = rawCalc.discountAmount ?? 0;
  if (rawCalc.discountAmount === undefined) {
    if (quotation.discountConfig?.type === 'fixed') {
      discountAmount = Math.min(quotation.discountConfig.value || 0, subtotalBeforeDiscount);
    } else if (quotation.discountConfig?.type === 'percentage') {
      discountAmount = Math.round((subtotalBeforeDiscount * (quotation.discountConfig.value || 0)) / 100);
    }
  }

  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;
  const isTaxEnabled = Boolean(quotation.taxConfig?.enabled);
  const taxableAmount = isTaxEnabled
    ? (rawCalc.taxableAmount ?? subtotalAfterDiscount)
    : 0;

  let taxAmount = 0;
  let cgst = undefined;
  let sgst = undefined;
  let igst = undefined;

  if (isTaxEnabled) {
    const taxRate = quotation.taxConfig?.rate ?? 18;
    if (rawCalc.taxAmount !== undefined && rawCalc.taxAmount > 0) {
      taxAmount = rawCalc.taxAmount;
      cgst = rawCalc.cgst;
      sgst = rawCalc.sgst;
      igst = rawCalc.igst;
    } else {
      taxAmount = Math.round((taxableAmount * taxRate) / 100);
      if (quotation.taxConfig?.isInterState) {
        igst = taxAmount;
      } else {
        cgst = Math.round(taxAmount / 2);
        sgst = taxAmount - cgst;
      }
    }
  }

  const grandTotal = isTaxEnabled
    ? (rawCalc.grandTotal !== undefined && rawCalc.grandTotal > 0
      ? (rawCalc.designFeesTotal === 0 && designFeesTotal > 0
        ? rawCalc.grandTotal + designFeesTotal + Math.round(designFeesTotal * ((quotation.taxConfig?.rate ?? 18) / 100))
        : rawCalc.grandTotal)
      : (subtotalAfterDiscount + taxAmount))
    : subtotalAfterDiscount;

  const calc = {
    ...rawCalc,
    roomsSubtotal,
    designFeesTotal,
    additionalChargesTotal,
    subtotalBeforeDiscount,
    discountAmount,
    subtotalAfterDiscount,
    taxableAmount,
    taxAmount,
    cgst,
    sgst,
    igst,
    grandTotal,
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        Loading quotation editor & calculation engine...
      </div>
    );
  }

  if (showPrintStudio) {
    return (
      <QuotationPrintStudio
        quotation={quotation}
        calc={calc}
        settings={studioSettings}
        onClose={() => setShowPrintStudio(false)}
        onIssue={handleIssue}
        isReadonly={isReadonly}
        saving={saving}
      />
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: '#ffffff',
              border: '1px solid #e8e3d9',
              color: '#4b5563',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: '600',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1c20', margin: 0 }}>
                {quotation.quotationNumber || 'New Draft Quotation'}
              </h2>
              {quotation.revisionNumber > 1 && (
                <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  Revision {quotation.revisionNumber}
                </span>
              )}
              <span className={`badge badge-${quotation.status}`}>
                {quotation.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
                {quotation.issueDate ? `Issued on ${formatDate(quotation.issueDate)}` : 'Draft estimate in progress'}
              </div>
              {!isReadonly && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: autoSaveStatus === 'saving' ? '#fffbeb' : '#f0fdf4',
                  color: autoSaveStatus === 'saving' ? '#b45309' : '#15803d',
                  border: `1px solid ${autoSaveStatus === 'saving' ? '#fde68a' : '#bbf7d0'}`,
                  fontWeight: '600',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: autoSaveStatus === 'saving' ? '#f59e0b' : '#22c55e',
                    display: 'inline-block',
                  }} />
                  <span>
                    {autoSaveStatus === 'saving'
                      ? 'Saving locally...'
                      : lastSavedTime
                        ? `Auto-saved locally at ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                        : 'Auto-saved to localStorage'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isIssued && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              disabled={saving}
              title="Discard local draft changes and start fresh"
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                padding: '9px 14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={15} />
              <span>Discard Draft</span>
            </button>
          )}

          {/* Print & Themes Button */}
          <button
            type="button"
            onClick={handleOpenPrintStudio}
            disabled={saving}
            style={{
              background: '#fbf6ec',
              color: '#b8860b',
              border: '1px solid #ebdcc5',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Preview print styling with 4 theme options"
          >
            <Printer size={16} />
            <span>Print & Themes</span>
          </button>

          {isReadonly ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {quotation.status !== 'approved' && (
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={saving}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                  title="Unlock this quotation to edit directly as Draft"
                >
                  Unlock to Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleRevise}
                disabled={saving}
                style={{
                  background: '#9333ea',
                  color: '#ffffff',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Create a new revision"
              >
                <RotateCcw size={15} />
                <span>Create Revision {quotation.revisionNumber + 1}</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                style={{
                  background: '#ffffff',
                  border: '1px solid #d6cfc2',
                  color: '#1a1c20',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPrintStudio}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(184, 134, 11, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                }}
                title="Proceed to Print Themes and Issuance"
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Read-Only Notice Banner */}
      {isReadonly && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} color="#d97706" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                This quotation is locked ({quotation.status.toUpperCase()})
              </div>
              <div style={{ fontSize: '12.5px', color: '#b45309', marginTop: '2px' }}>
                Issued and approved quotations cannot be modified directly to preserve client history. Click <strong>Unlock to Edit</strong> to make direct changes, or <strong>Create Revision</strong> to start Revision {quotation.revisionNumber + 1}.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {quotation.status !== 'approved' && (
              <button
                type="button"
                onClick={handleReopen}
                disabled={saving}
                style={{
                  background: '#ffffff',
                  border: '1px solid #d97706',
                  color: '#92400e',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Unlock to Edit
              </button>
            )}
            <button
              type="button"
              onClick={handleRevise}
              disabled={saving}
              style={{
                background: '#9333ea',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <RotateCcw size={13} />
              <span>Create Revision {quotation.revisionNumber + 1}</span>
            </button>
          </div>
        </div>
      )}

      {/* Draft Restored Banner */}
      {isDraftRestored && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af' }}>
            <Sparkles size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: '700', fontSize: '13px' }}>Unsaved Draft Recovered: </span>
              <span style={{ fontSize: '13px' }}>
                Your quotation items and configuration have been automatically restored from local storage
                {lastSavedTime ? ` (saved at ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDiscardDraft}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#b91c1c',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Discard & Reset
            </button>
            <button
              type="button"
              onClick={() => setIsDraftRestored(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Project Conflict Banner */}
      {projectConflict && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e' }}>
            <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: '13px' }}>
              You have an active draft for <strong>{projects.find(p => p._id === projectConflict.draftProjectId)?.projectName || 'another project'}</strong>, but navigated to <strong>{projects.find(p => p._id === projectConflict.requestedProjectId)?.projectName || 'selected project'}</strong>.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setQuotation(prev => ({ ...prev, projectId: projectConflict.requestedProjectId }));
                setProjectConflict(null);
              }}
              style={{
                background: '#d97706',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Switch to Requested Project
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              style={{
                background: '#ffffff',
                border: '1px solid #fde68a',
                color: '#dc2626',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Start New Empty
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', fontSize: '13.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '10px', fontSize: '13.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Project & Client Selector Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '18px 24px',
        border: '1px solid #e8e3d9',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        alignItems: 'start',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
            Associated Project <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={quotation.projectId}
            disabled={isReadonly}
            onChange={(e) => setQuotation({ ...quotation, projectId: e.target.value })}
            style={{ width: '100%', height: '42px', fontWeight: '600' }}
          >
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectName} ({typeof p.clientId === 'object' ? p.clientId?.name : 'Client'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
            Tax Configuration (GST)
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={!quotation.taxConfig?.enabled ? 'none' : (quotation.taxConfig?.isInterState ? 'inter' : 'intra')}
              disabled={isReadonly}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'none') {
                  setQuotation({
                    ...quotation,
                    taxConfig: { ...quotation.taxConfig, enabled: false },
                  });
                } else if (val === 'inter') {
                  setQuotation({
                    ...quotation,
                    taxConfig: { ...quotation.taxConfig, enabled: true, isInterState: true, rate: 18 },
                  });
                } else {
                  setQuotation({
                    ...quotation,
                    taxConfig: { ...quotation.taxConfig, enabled: true, isInterState: false, rate: 18 },
                  });
                }
              }}
              style={{ flex: '1 1 180px', minWidth: 0, height: '42px' }}
            >
              <option value="none">No Tax / GST (0%)</option>
              <option value="intra">Intra-State GST (CGST 9% + SGST 9% = 18%)</option>
              <option value="inter">Inter-State GST (IGST 18%)</option>
            </select>
            {quotation.taxConfig?.enabled && (
              <select
                value={quotation.taxConfig?.type || 'exclusive'}
                disabled={isReadonly}
                onChange={(e) => setQuotation({
                  ...quotation,
                  taxConfig: { ...quotation.taxConfig, type: e.target.value },
                })}
                style={{ width: '135px', height: '42px', flexShrink: 0 }}
              >
                <option value="exclusive">Tax Exclusive</option>
                <option value="inclusive">Tax Inclusive</option>
              </select>
            )}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
            Validity Period <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            value={quotation.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : ''}
            disabled={isReadonly}
            onChange={(e) => {
              setQuotation({
                ...quotation,
                validUntil: e.target.value ? new Date(e.target.value).toISOString() : null,
              });
            }}
            style={{
              width: '100%',
              height: '42px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d6cfc2',
              fontSize: '13.5px',
              fontWeight: '600',
              color: '#374151',
              background: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Main Room Editor Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e8e3d9',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Room Tabs */}
        <div style={{
          background: '#faf8f5',
          borderBottom: '1px solid #e8e3d9',
          padding: '8px 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
        }}>
          {quotation.rooms.map((room, idx) => {
            const isActive = idx === activeRoomIndex;
            return (
              <div
                key={room.roomId || idx}
                onClick={() => setActiveRoomIndex(idx)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px 8px 0 0',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#1a1c20' : '#6b7280',
                  borderTop: isActive ? '2px solid #b8860b' : '2px solid transparent',
                  borderLeft: isActive ? '1px solid #e8e3d9' : '1px solid transparent',
                  borderRight: isActive ? '1px solid #e8e3d9' : '1px solid transparent',
                  borderBottom: isActive ? '1px solid #ffffff' : 'none',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  bottom: '-1px',
                }}
              >
                <span>{room.name}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  background: isActive ? '#fcf6ec' : '#f3efe8',
                  color: isActive ? '#b8860b' : '#6b7280',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  {formatINR(room.subtotal || 0)}
                </span>
                {!isReadonly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(idx);
                    }}
                    style={{ color: '#9ca3af', padding: '2px', marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Delete Room"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {!isReadonly && (
            <button
              onClick={() => setNewRoomModalOpen(true)}
              style={{
                background: '#f3efe8',
                color: '#4b5563',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              <Plus size={14} />
              <span>Add Room</span>
            </button>
          )}
        </div>

        {!currentRoom ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Layers size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
              No Rooms Added Yet
            </h4>
            <p style={{ fontSize: '13.5px', color: '#6b7280', marginTop: '6px', marginBottom: '20px', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
              Add a room or area (e.g. Living Room, Kitchen, Bedroom, Office) to begin itemizing woodwork and furnishings.
            </p>
            {!isReadonly && (
              <button
                type="button"
                onClick={() => setNewRoomModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(184, 134, 11, 0.25)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Add First Room</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Room Items Toolbar */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e8e3d9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
                  {currentRoom.name}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '2px 0 0' }}>
                  {currentRoom.items.length} line item(s) in this space • Room Subtotal: <strong>{formatINR(currentRoom.subtotal || 0)}</strong>
                </p>
              </div>

              {!isReadonly && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setCatalogueModalOpen(true)}
                    style={{
                      background: '#fbf6ec',
                      color: '#b8860b',
                      border: '1px solid #ebdcc5',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    <Layers size={15} />
                    <span>Add from Catalogue</span>
                  </button>

                  <button
                    onClick={handleAddCustomItem}
                    style={{
                      background: '#f3efe8',
                      color: '#4b5563',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    <Plus size={15} />
                    <span>Custom Item</span>
                  </button>
                </div>
              )}
            </div>

            {/* Items Table */}
            {currentRoom.items.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Layers size={36} style={{ color: '#d1d5db', marginBottom: '10px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: 0 }}>
                  No items in {currentRoom.name}
                </h4>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: '16px' }}>
                  Add items from the pre-priced catalogue or specify a custom item.
                </p>
                {!isReadonly && (
                  <button
                    onClick={() => setCatalogueModalOpen(true)}
                    style={{ background: '#b8860b', color: '#ffffff', padding: '8px 16px', fontWeight: '600' }}
                  >
                    <Layers size={16} />
                    <span>Browse Catalogue</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#faf8f5', borderBottom: '1px solid #e8e3d9', color: '#4b5563', fontWeight: '600', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 16px', width: '30%' }}>Item Description & Specs</th>
                      <th style={{ padding: '12px 12px', width: '22%' }}>Measurement & Formula</th>
                      <th style={{ padding: '12px 12px', width: '10%' }}>SQ FT</th>
                      <th style={{ padding: '12px 12px', width: '10%' }}>Unit</th>
                      <th style={{ padding: '12px 12px', width: '12%' }}>Rate (₹)</th>
                      <th style={{ padding: '12px 16px', width: '12%', textAlign: 'right' }}>Amount</th>
                      {!isReadonly && <th style={{ padding: '12px 16px', width: '4%', textAlign: 'right' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoom.items.map((item, iIdx) => (
                      <tr
                        key={item.itemId || iIdx}
                        style={{
                          borderBottom: '1px solid #f1ece4',
                          background: item.isOptional && !item.isIncluded ? '#fafafa' : '#ffffff',
                          opacity: item.isOptional && !item.isIncluded ? 0.65 : 1,
                        }}
                      >
                        {/* Item Name & Specs */}
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            id={`item-name-${item.itemId || iIdx}`}
                            type="text"
                            value={item.name}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateItem(iIdx, 'name', e.target.value)}
                            style={{ width: '100%', fontWeight: '600', marginBottom: '4px' }}
                            placeholder="Item Name"
                          />
                          <input
                            type="text"
                            value={item.specifications || ''}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateItem(iIdx, 'specifications', e.target.value)}
                            placeholder="Specifications / Brands / Grade"
                            style={{ width: '100%', fontSize: '11.5px', color: '#6b7280' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8c7851', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={item.isOptional}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'isOptional', e.target.checked)}
                              />
                              <span>Optional Item</span>
                            </label>
                            {item.isOptional && (
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={item.isIncluded}
                                  disabled={isReadonly}
                                  onChange={(e) => handleUpdateItem(iIdx, 'isIncluded', e.target.checked)}
                                />
                                <span>Include in Total</span>
                              </label>
                            )}
                          </div>
                        </td>

                        {/* Formula & Dimensions */}
                        <td style={{ padding: '12px 12px' }}>
                          <select
                            value={item.calculationMethod || 'manual'}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateItem(iIdx, 'calculationMethod', e.target.value)}
                            style={{ width: '100%', fontSize: '12px', marginBottom: '4px' }}
                          >
                            {Object.entries(CALCULATION_METHOD_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>

                          {/* Interactive Dimensions */}
                          {item.calculationMethod === 'manual' && (
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                              <input
                                type="number"
                                value={item.dimensions?.length || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.length', e.target.value)}
                                placeholder="L (ft)"
                                style={{ width: '48px', padding: '3px 4px', fontSize: '11px' }}
                                title="Length in feet (dimensions only - does not multiply quantity)"
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.width || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.width', e.target.value)}
                                placeholder="W (ft)"
                                style={{ width: '48px', padding: '3px 4px', fontSize: '11px' }}
                                title="Width in feet"
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.height || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.height', e.target.value)}
                                placeholder="H (ft)"
                                style={{ width: '48px', padding: '3px 4px', fontSize: '11px' }}
                                title="Height in feet"
                              />
                            </div>
                          )}

                          {item.calculationMethod === 'length_x_width' && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px' }}>
                              <input
                                type="number"
                                value={item.dimensions?.length || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.length', e.target.value)}
                                placeholder="L (ft)"
                                style={{ width: '60px', padding: '4px 6px' }}
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.width || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.width', e.target.value)}
                                placeholder="W (ft)"
                                style={{ width: '60px', padding: '4px 6px' }}
                              />
                            </div>
                          )}

                          {item.calculationMethod === 'length_x_height' && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px' }}>
                              <input
                                type="number"
                                value={item.dimensions?.length || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.length', e.target.value)}
                                placeholder="L (ft)"
                                style={{ width: '60px', padding: '4px 6px' }}
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.height || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.height', e.target.value)}
                                placeholder="H (ft)"
                                style={{ width: '60px', padding: '4px 6px' }}
                              />
                            </div>
                          )}

                          {item.calculationMethod === 'length_x_width_x_height' && (
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'center', fontSize: '11px' }}>
                              <input
                                type="number"
                                value={item.dimensions?.length || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.length', e.target.value)}
                                placeholder="L (ft)"
                                style={{ width: '48px', padding: '3px 4px', fontSize: '11px' }}
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.width || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.width', e.target.value)}
                                placeholder="W (ft)"
                                style={{ width: '48px', padding: '3px 4px', fontSize: '11px' }}
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.height || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.height', e.target.value)}
                                placeholder="H (ft)"
                                style={{ width: '48px', padding: '3px 4px', fontSize: '11px' }}
                              />
                            </div>
                          )}

                          {item.calculationMethod === 'count_x_per_unit' && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px' }}>
                              <input
                                type="number"
                                value={item.dimensions?.count || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.count', e.target.value)}
                                placeholder="Count"
                                style={{ width: '60px', padding: '4px 6px' }}
                              />
                              <span>×</span>
                              <input
                                type="number"
                                value={item.dimensions?.perUnit || ''}
                                disabled={isReadonly}
                                onChange={(e) => handleUpdateItem(iIdx, 'dimensions.perUnit', e.target.value)}
                                placeholder="Per unit"
                                style={{ width: '65px', padding: '4px 6px' }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Quantity / SQ FT */}
                        <td style={{ padding: '12px 12px' }}>
                          <input
                            type="number"
                            value={item.quantity === '' || item.quantity === null || item.quantity === undefined ? '' : item.quantity}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateItem(iIdx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="SQ FT"
                            style={{ width: '70px', fontWeight: '600' }}
                          />
                          <div style={{ fontSize: '10px', marginTop: '2px', color: item.calculationMethod === 'manual' ? '#6b7280' : '#b8860b', fontWeight: '500' }}>
                            {item.calculationMethod === 'manual' ? 'Count / Pcs' : 'Calc. Area'}
                          </div>
                        </td>

                        {/* Unit */}
                        <td style={{ padding: '12px 12px' }}>
                          <select
                            value={item.unit}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateItem(iIdx, 'unit', e.target.value)}
                            style={{ width: '85px', fontSize: '12px' }}
                          >
                            {Object.entries(UNIT_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>

                        {/* Rate INR */}
                        <td style={{ padding: '12px 12px' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate !== undefined && item.rate !== null && item.rate !== '' && Number(item.rate) !== 0 ? toINR(item.rate) : ''}
                            disabled={isReadonly}
                            onChange={(e) => handleUpdateItem(iIdx, 'rateINR', e.target.value)}
                            placeholder="Rate"
                            style={{ width: '90px', fontWeight: '600' }}
                          />
                        </td>

                        {/* Calculated Amount */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', fontSize: '14px', color: '#1a1c20' }}>
                          {formatINR(item.amount || 0)}
                        </td>

                        {/* Row Action Controls */}
                        {!isReadonly && (
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                onClick={() => handleDuplicateItem(iIdx)}
                                style={{ color: '#6b7280', padding: '4px', borderRadius: '4px' }}
                                title="Duplicate Item"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(iIdx)}
                                style={{ color: '#ef4444', padding: '4px', borderRadius: '4px' }}
                                title="Delete Item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Financial Summary & Milestones Split Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '28px',
      }}>
        {/* Left: Design Fees & Payment Schedule */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e8e3d9',
          padding: '22px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Header with Title, Total, and Add Fee Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
              Design Fees & Adjustments
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#b8860b' }}>
                {formatINR(calc.designFeesTotal || 0)}
              </span>
              {!isReadonly && (
                <button
                  type="button"
                  onClick={handleAddDesignFee}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#b8860b',
                    background: '#fdf8ee',
                    border: '1px solid #d4af37',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Add custom architectural or design fee"
                >
                  <Plus size={13} />
                  Add Fee
                </button>
              )}
            </div>
          </div>

          {/* Fees List */}
          {(!quotation.designFees || quotation.designFees.length === 0) ? (
            <div style={{ padding: '12px', background: '#fdfbf7', border: '1px dashed #ebdcc5', borderRadius: '8px', textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#8c7851' }}>No design or architectural fees added.</span>
            </div>
          ) : (
            (quotation.designFees || []).map((fee, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '12px',
                  padding: '12px 14px',
                  background: '#fdfbf7',
                  border: '1px solid #ebdcc5',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Fee Header: Name input + Row Amount + Delete */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                  <input
                    type="text"
                    disabled={isReadonly}
                    value={fee.description || ''}
                    onChange={(e) => handleUpdateDesignFee(idx, { description: e.target.value })}
                    placeholder="Fee Name (e.g. Interior Designer Professional Fees)"
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#1a1c20',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#b8860b', whiteSpace: 'nowrap' }}>
                      {formatINR(fee.calculatedAmount ?? fee.amount ?? 0)}
                    </span>
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDesignFee(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                        }}
                        title="Remove fee"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fee Inputs Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={fee.feeType || 'per_sqft'}
                    disabled={isReadonly}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      if (nextType === 'per_sqft') {
                        handleUpdateDesignFee(idx, { feeType: nextType, sqft: fee.sqft ?? '', ratePerSqft: fee.ratePerSqft ?? '' });
                      } else if (nextType === 'fixed') {
                        handleUpdateDesignFee(idx, { feeType: nextType, amount: fee.amount || toPaise(25000) });
                      } else if (nextType === 'percentage') {
                        handleUpdateDesignFee(idx, { feeType: nextType, amount: 8 });
                      }
                    }}
                    style={{ fontSize: '12px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff' }}
                  >
                    <option value="per_sqft">Per Sq. Ft. (₹/sqft)</option>
                    <option value="fixed">Manual (Fixed ₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>

                  {fee.feeType === 'per_sqft' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        disabled={isReadonly}
                        value={fee.sqft !== undefined && fee.sqft !== null ? fee.sqft : ''}
                        onChange={(e) => handleUpdateDesignFee(idx, { sqft: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="1200"
                        style={{ width: '80px', padding: '5px 8px', fontWeight: '600', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        title="Area in Sq. Ft."
                      />
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>sq.ft. @ ₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        disabled={isReadonly}
                        value={fee.ratePerSqft !== undefined && fee.ratePerSqft !== null && fee.ratePerSqft !== '' ? toINR(fee.ratePerSqft) : ''}
                        onChange={(e) => handleUpdateDesignFee(idx, { ratePerSqft: e.target.value === '' ? '' : toPaise(e.target.value) })}
                        placeholder="80"
                        style={{ width: '70px', padding: '5px 8px', fontWeight: '600', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        title="Rate per Sq. Ft. in ₹"
                      />
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>/sq.ft.</span>
                    </div>
                  )}

                  {fee.feeType === 'fixed' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>₹</span>
                      <input
                        type="number"
                        step="100"
                        disabled={isReadonly}
                        value={fee.amount ? toINR(fee.amount) : ''}
                        onChange={(e) => handleUpdateDesignFee(idx, { amount: e.target.value === '' ? 0 : toPaise(e.target.value) })}
                        placeholder="Enter fixed fee in ₹"
                        style={{ width: '130px', padding: '5px 8px', fontWeight: '600', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  )}

                  {fee.feeType === 'percentage' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.5"
                        disabled={isReadonly}
                        value={fee.amount > 100 ? fee.amount / 100 : (fee.amount || '')}
                        onChange={(e) => handleUpdateDesignFee(idx, { amount: Number(e.target.value) || 0 })}
                        placeholder="e.g. 8"
                        style={{ width: '70px', padding: '5px 8px', fontWeight: '600', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        % of execution ({formatINR(calc.roomsSubtotal || 0)})
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: '#8c7851', marginTop: '6px' }}>
                  {fee.feeType === 'per_sqft' && (
                    (fee.sqft && fee.ratePerSqft)
                      ? `${fee.sqft} sq.ft. × ₹${toINR(fee.ratePerSqft)}/sqft = ${formatINR(fee.calculatedAmount ?? fee.amount ?? 0)}`
                      : 'Enter sq. ft. (e.g. 1200) and rate (e.g. 80) to calculate fee.'
                  )}
                  {fee.feeType === 'fixed' && 'Manual lump-sum design fee.'}
                  {fee.feeType === 'percentage' && `Calculated automatically on execution subtotal.`}
                </div>
              </div>
            ))
          )}

          {/* Discount Box */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>
              Client Discount
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={quotation.discountConfig?.type || 'none'}
                disabled={isReadonly}
                onChange={(e) => setQuotation({
                  ...quotation,
                  discountConfig: { ...quotation.discountConfig, type: e.target.value },
                })}
                style={{ width: '130px' }}
              >
                <option value="none">No Discount</option>
                <option value="fixed">Fixed (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              {quotation.discountConfig?.type !== 'none' && (
                <input
                  type="number"
                  disabled={isReadonly}
                  value={quotation.discountConfig?.type === 'fixed'
                    ? toINR(quotation.discountConfig?.value)
                    : quotation.discountConfig?.value}
                  onChange={(e) => setQuotation({
                    ...quotation,
                    discountConfig: {
                      ...quotation.discountConfig,
                      value: quotation.discountConfig?.type === 'fixed'
                        ? toPaise(e.target.value)
                        : Number(e.target.value) || 0,
                    },
                  })}
                  placeholder="Amount / %"
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </div>

          {/* Payment Milestones Preview */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
                Payment Milestones Breakdown
              </h5>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                100% Scheduled
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(quotation.paymentMilestones || []).map((m, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
                  <span style={{ color: '#4b5563' }}>{m.description} ({m.percentage}%)</span>
                  <span style={{ fontWeight: '600', color: '#1a1c20' }}>{formatINR(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Master Financial Engine Calculation Breakdown */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e8e3d9',
          padding: '22px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1c20', margin: '0 0 16px' }}>
              Financial Summary (Paise Precision)
            </h4>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: '#4b5563' }}>Rooms Execution Subtotal</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatINR(calc.roomsSubtotal || 0)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#4b5563' }}>Design & Architectural Fees</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatINR(calc.designFeesTotal || 0)}</td>
                </tr>
                {calc.discountAmount > 0 && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#16a34a' }}>Special Discount Applied</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                      - {formatINR(calc.discountAmount)}
                    </td>
                  </tr>
                )}
                {Boolean(quotation.taxConfig?.enabled) && (
                  <>
                    <tr style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', color: '#4b5563' }}>Taxable Base Amount</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{formatINR(calc.taxableAmount || 0)}</td>
                    </tr>
                    {calc.cgst > 0 && (
                      <>
                        <tr>
                          <td style={{ padding: '6px 0', color: '#6b7280', fontSize: '12.5px' }}>Central GST (CGST 9%)</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '12.5px' }}>{formatINR(calc.cgst)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 0', color: '#6b7280', fontSize: '12.5px' }}>State GST (SGST 9%)</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '12.5px' }}>{formatINR(calc.sgst)}</td>
                        </tr>
                      </>
                    )}
                    {calc.igst > 0 && (
                      <tr>
                        <td style={{ padding: '6px 0', color: '#6b7280', fontSize: '12.5px' }}>Integrated GST (IGST 18%)</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '12.5px' }}>{formatINR(calc.igst)}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Grand Total Box */}
          <div style={{
            marginTop: '20px',
            background: '#191b20',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#d4af37', fontWeight: '700' }}>
                Quotation Grand Total
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                Inclusive of specified materials & taxes
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#f5deb3' }}>
              {formatINR(calc.grandTotal || 0)}
            </div>
          </div>

          <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleOpenPrintStudio}
              disabled={saving}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(184, 134, 11, 0.35)',
              }}
            >
              <span>Next: Preview Themes & Print</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Catalogue Picker Modal */}
      {catalogueModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e8e3d9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
                  Select Item from Catalogue
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                  Click any item to insert it directly into {currentRoom?.name || 'selected room'}
                </p>
              </div>
              <button
                onClick={() => setCatalogueModalOpen(false)}
                style={{ color: '#9ca3af', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {catalogueItems.map((catItem) => (
                  <div
                    key={catItem._id}
                    onClick={() => handleAddItemFromCatalogue(catItem)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      border: '1px solid #e8e3d9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#b8860b';
                      e.currentTarget.style.background = '#fcf8ec';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e8e3d9';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1c20' }}>
                        {catItem.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {catItem.description}
                      </div>
                      {catItem.defaultSpecifications && (
                        <div style={{ fontSize: '11px', color: '#8c7851', marginTop: '2px' }}>
                          ⚙️ {catItem.defaultSpecifications}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a1c20' }}>
                        {formatINR(catItem.defaultRate)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c7851' }}>
                        per {catItem.defaultUnit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Room Modal */}
      {newRoomModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1c20', margin: '0 0 14px' }}>
              Add Room / Space
            </h3>
            <input
              type="text"
              autoFocus
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. Guest Bedroom, Foyer, Kitchen, Balcony"
              style={{ width: '100%', height: '42px', marginBottom: '16px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddRoom();
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setNewRoomModalOpen(false)}
                style={{ background: '#f3efe8', color: '#4b5563', padding: '8px 16px', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRoom}
                style={{ background: '#b8860b', color: '#ffffff', padding: '8px 18px', fontWeight: '600' }}
              >
                Add Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
