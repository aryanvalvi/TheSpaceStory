import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
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
} from 'lucide-react';

export default function QuotationEditor({ quotationId, onBack, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown options
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalogueItems, setCatalogueItems] = useState([]);
  const [catalogueModalOpen, setCatalogueModalOpen] = useState(false);
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  // Main Quotation Form State
  const [quotation, setQuotation] = useState({
    quotationNumber: 'Draft',
    revisionNumber: 1,
    status: 'draft',
    projectId: '',
    version: 1,
    rooms: [
      {
        roomId: 'room-1',
        name: 'Master Bedroom',
        items: [],
        subtotal: 0,
      },
    ],
    designFees: [
      {
        description: 'Design & Architectural Supervision',
        feeType: 'fixed',
        amount: toPaise(0),
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
      enabled: true,
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
  }, [quotationId]);

  async function initData() {
    try {
      setLoading(true);
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

      if (quotationId && quotationId !== 'new') {
        const q = await api.getQuotation(quotationId);
        setQuotation({
          ...q,
          projectId: typeof q.projectId === 'object' ? q.projectId?._id : q.projectId,
        });
      } else {
        // Defaults from Studio Settings
        if (sData) {
          setQuotation((prev) => ({
            ...prev,
            projectId: loadedProjects[0]?._id || '',
            terms: sData.defaultTerms || [],
            inclusions: sData.defaultInclusions || [],
            exclusions: sData.defaultExclusions || [],
            paymentMilestones: (sData.defaultPaymentMilestones || []).map((m) => ({
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
    }
  }

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

  async function runCalculationPreview() {
    try {
      const calcPayload = {
        rooms: quotation.rooms.map((r) => ({
          roomId: r.roomId,
          name: r.name,
          items: r.items.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            unit: i.unit,
            quantity: i.quantity,
            rate: i.rate,
            dimensions: i.dimensions,
            calculationMethod: (['piece', 'set', 'nos'].includes(i.unit) || i.calculationMethod === 'manual') ? 'manual' : i.calculationMethod,
            isOptional: i.isOptional,
            isIncluded: i.isIncluded,
          })),
        })),
        designFees: quotation.designFees,
        additionalCharges: quotation.additionalCharges,
        discountConfig: quotation.discountConfig,
        taxConfig: quotation.taxConfig,
        paymentMilestones: quotation.paymentMilestones,
        carpetAreaSqFt: quotation.carpetAreaSqFt,
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

          return {
            ...prev,
            rooms: updatedRooms,
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
    if (quotation.rooms.length <= 1) {
      alert('A quotation must have at least one room.');
      return;
    }
    if (!confirm(`Delete "${quotation.rooms[index].name}" and all its items?`)) return;
    const updated = quotation.rooms.filter((_, i) => i !== index);
    setQuotation({ ...quotation, rooms: updated });
    if (activeRoomIndex >= updated.length) {
      setActiveRoomIndex(updated.length - 1);
    }
  };

  // Line item handlers
  const handleAddItemFromCatalogue = (catItem) => {
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
      order: quotation.rooms[activeRoomIndex]?.items.length || 0,
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
    rooms[activeRoomIndex].items.push(newItem);
    setQuotation({ ...quotation, rooms });
    setCatalogueModalOpen(false);
  };

  const handleAddCustomItem = () => {
    const newItem = {
      itemId: `item-${Date.now()}`,
      name: 'Custom Crafted Item',
      description: '',
      specifications: '',
      unit: 'piece',
      calculationMethod: 'manual',
      dimensions: { length: 0, width: 0, height: 0, count: 0, perUnit: 0 },
      quantity: 1,
      rate: toPaise(1000), // default ₹1000.00
      amount: toPaise(1000),
      isOptional: false,
      isIncluded: true,
      order: quotation.rooms[activeRoomIndex]?.items.length || 0,
    };

    const rooms = [...quotation.rooms];
    rooms[activeRoomIndex].items.push(newItem);
    setQuotation({ ...quotation, rooms });
  };

  const handleUpdateItem = (itemIndex, field, value) => {
    const rooms = [...quotation.rooms];
    const item = { ...rooms[activeRoomIndex].items[itemIndex] };

    if (field === 'rateINR') {
      item.rate = toPaise(value);
      item.amount = Math.round((Number(item.quantity) || 0) * item.rate);
    } else if (field.startsWith('dimensions.')) {
      const dimField = field.split('.')[1];
      item.dimensions = { ...item.dimensions, [dimField]: Number(value) || 0 };
      // CRITICAL: Dimensions must NEVER overwrite or increase item.quantity!
      // Quantity is controlled independently by the user (e.g. 1 Table, 2 Beds).
      item.amount = Math.round((Number(item.quantity) || 0) * (item.rate || 0));
    } else if (field === 'calculationMethod') {
      item.calculationMethod = value;
      item.amount = Math.round((Number(item.quantity) || 0) * (item.rate || 0));
    } else if (field === 'unit') {
      item.unit = value;
      if (['piece', 'set', 'nos'].includes(value)) {
        item.calculationMethod = 'manual';
      }
      item.amount = Math.round((Number(item.quantity) || 0) * (item.rate || 0));
    } else if (field === 'quantity') {
      item.quantity = Number(value) || 0;
      item.amount = Math.round(item.quantity * (item.rate || 0));
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

  const currentDesignFee = quotation.designFees?.[0] || {
    description: 'Design & Architectural Supervision',
    feeType: 'fixed',
    amount: 0,
    isTaxable: true,
  };

  const handleUpdateDesignFeeType = (type) => {
    let newAmount = 0;
    if (type === 'percentage') {
      newAmount = 8;
    } else if (type === 'fixed') {
      newAmount = toPaise(25000);
    } else if (type === 'per_sqft') {
      newAmount = toPaise(150);
    }

    const updated = [
      {
        description: type === 'fixed'
          ? 'Design & Architecture Fee (Manual Fixed)'
          : type === 'percentage'
          ? 'Design & Architecture Supervision (8%)'
          : type === 'per_sqft'
          ? 'Design & Architecture Fee (Per Sq. Ft.)'
          : 'Design & Architecture Fee',
        feeType: type === 'none' ? 'fixed' : type,
        amount: type === 'none' ? 0 : newAmount,
        calculatedAmount: 0,
        isTaxable: true,
      },
    ];
    setQuotation({ ...quotation, designFees: updated });
  };

  const handleUpdateDesignFeeAmount = (val) => {
    const updated = [
      {
        ...currentDesignFee,
        amount: val,
      },
    ];
    setQuotation({ ...quotation, designFees: updated });
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
      let saved;
      if (quotation._id) {
        saved = await api.updateQuotation(quotation._id, {
          ...quotation,
          version: quotation.version,
        });
      } else {
        saved = await api.createQuotation(quotation);
      }
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
      // Save current changes first if draft
      if (quotation._id) {
        await api.updateQuotation(quotation._id, { ...quotation, version: quotation.version });
        const issued = await api.issueQuotation(quotation._id);
        setQuotation(issued);
        setSuccessMsg('Quotation issued successfully!');
      } else {
        const saved = await api.createQuotation(quotation);
        const issued = await api.issueQuotation(saved._id);
        setQuotation(issued);
        setSuccessMsg('Quotation issued successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to issue quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleRevise = async () => {
    if (!confirm('Create a new revision from this quotation?')) return;
    setSaving(true);
    try {
      const newRev = await api.createRevision(quotation._id);
      setQuotation(newRev);
      setSuccessMsg(`Created Revision ${newRev.revisionNumber}!`);
    } catch (err) {
      setError(err.message || 'Failed to create revision');
    } finally {
      setSaving(false);
    }
  };

  const isIssued = quotation.status === 'issued';
  const isReadonly = ['issued', 'approved', 'rejected', 'cancelled'].includes(quotation.status);

  const currentRoom = quotation.rooms[activeRoomIndex] || quotation.rooms[0] || { items: [] };
  const calc = quotation.calculationSnapshot || {};

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        Loading quotation editor & calculation engine...
      </div>
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
            <div style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
              {quotation.issueDate ? `Issued on ${formatDate(quotation.issueDate)}` : 'Draft estimate in progress'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {quotation._id && (
            <a
              href={api.getQuotationPdfUrl(quotation._id)}
              target="_blank"
              rel="noreferrer"
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
                textDecoration: 'none',
              }}
            >
              <Printer size={16} />
              <span>Print / View PDF</span>
            </a>
          )}

          {isIssued ? (
            <button
              onClick={handleRevise}
              disabled={saving}
              style={{
                background: '#9333ea',
                color: '#ffffff',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: '600',
              }}
            >
              <RotateCcw size={16} />
              <span>Create Revision</span>
            </button>
          ) : (
            <>
              <button
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
                }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                onClick={handleIssue}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
                  color: '#ffffff',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(184, 134, 11, 0.3)',
                }}
              >
                <Send size={16} />
                <span>Issue to Client</span>
              </button>
            </>
          )}
        </div>
      </div>

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
            Associated Project *
          </label>
          <select
            value={quotation.projectId}
            disabled={isReadonly}
            onChange={(e) => setQuotation({ ...quotation, projectId: e.target.value })}
            style={{ width: '100%', height: '40px', fontWeight: '600' }}
          >
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectName} ({typeof p.clientId === 'object' ? p.clientId?.name : 'Client'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
            Tax Configuration (GST)
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={quotation.taxConfig?.isInterState ? 'inter' : 'intra'}
              disabled={isReadonly}
              onChange={(e) => setQuotation({
                ...quotation,
                taxConfig: { ...quotation.taxConfig, isInterState: e.target.value === 'inter' },
              })}
              style={{ flex: 1, height: '40px' }}
            >
              <option value="intra">Intra-State (CGST 9% + SGST 9%)</option>
              <option value="inter">Inter-State (IGST 18%)</option>
            </select>
            <select
              value={quotation.taxConfig?.type || 'exclusive'}
              disabled={isReadonly}
              onChange={(e) => setQuotation({
                ...quotation,
                taxConfig: { ...quotation.taxConfig, type: e.target.value },
              })}
              style={{ width: '140px', height: '40px' }}
            >
              <option value="exclusive">Tax Exclusive</option>
              <option value="inclusive">Tax Inclusive</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', marginBottom: '6px' }}>
            Validity Period
          </label>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', height: '40px', display: 'flex', alignItems: 'center' }}>
            📅 {quotation.validUntil ? formatDate(quotation.validUntil) : '30 days from issuance'}
          </div>
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
                {!isReadonly && quotation.rooms.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(idx);
                    }}
                    style={{ color: '#9ca3af', padding: '2px', marginLeft: '4px' }}
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
                  <th style={{ padding: '12px 12px', width: '10%' }}>Qty</th>
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

                    {/* Quantity */}
                    <td style={{ padding: '12px 12px' }}>
                      <input
                        type="number"
                        value={item.quantity}
                        disabled={isReadonly}
                        onChange={(e) => handleUpdateItem(iIdx, 'quantity', Number(e.target.value) || 0)}
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
                        value={toINR(item.rate)}
                        disabled={isReadonly}
                        onChange={(e) => handleUpdateItem(iIdx, 'rateINR', e.target.value)}
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
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1c20', margin: '0 0 14px' }}>
            Design Fees & Adjustments
          </h4>

          {/* Design Fee Box */}
          <div style={{ marginBottom: '16px', padding: '14px', background: '#fdfbf7', border: '1px solid #ebdcc5', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1c20' }}>
                Design & Architectural Fees
              </span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#b8860b' }}>
                {formatINR(calc.designFeesTotal || 0)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <select
                value={currentDesignFee.amount === 0 && currentDesignFee.feeType === 'fixed' ? 'none' : (currentDesignFee.feeType || 'fixed')}
                disabled={isReadonly}
                onChange={(e) => handleUpdateDesignFeeType(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="fixed">Manual (Fixed ₹)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="per_sqft">Per Sq. Ft. (₹/sqft)</option>
                <option value="none">No Fee (₹0)</option>
              </select>

              {currentDesignFee.feeType === 'fixed' && currentDesignFee.amount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>₹</span>
                  <input
                    type="number"
                    step="100"
                    disabled={isReadonly}
                    value={toINR(currentDesignFee.amount)}
                    onChange={(e) => handleUpdateDesignFeeAmount(toPaise(e.target.value))}
                    placeholder="Enter fixed fee in ₹"
                    style={{ width: '100%', padding: '6px 10px', fontWeight: '600', fontSize: '13px' }}
                  />
                </div>
              )}

              {currentDesignFee.feeType === 'percentage' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.5"
                    disabled={isReadonly}
                    value={currentDesignFee.amount > 100 ? currentDesignFee.amount / 100 : currentDesignFee.amount}
                    onChange={(e) => handleUpdateDesignFeeAmount(Number(e.target.value) || 0)}
                    placeholder="e.g. 8"
                    style={{ width: '75px', padding: '6px 8px', fontWeight: '600', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    % of execution subtotal
                  </span>
                </div>
              )}

              {currentDesignFee.feeType === 'per_sqft' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>₹</span>
                  <input
                    type="number"
                    step="10"
                    disabled={isReadonly}
                    value={toINR(currentDesignFee.amount)}
                    onChange={(e) => handleUpdateDesignFeeAmount(toPaise(e.target.value))}
                    placeholder="150"
                    style={{ width: '85px', padding: '6px 8px', fontWeight: '600', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    / sq.ft. (Carpet: {quotation.carpetAreaSqFt || 0} sqft)
                  </span>
                </div>
              )}

              {(currentDesignFee.amount === 0 && currentDesignFee.feeType === 'fixed') && (
                <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                  No fee applied
                </span>
              )}
            </div>

            <div style={{ fontSize: '11px', color: '#8c7851' }}>
              {currentDesignFee.feeType === 'fixed' && currentDesignFee.amount > 0 && 'Manual lump-sum architectural/interior design charge.'}
              {currentDesignFee.feeType === 'percentage' && `Calculated automatically on total woodwork and furniture execution (${formatINR(calc.roomsSubtotal || 0)}).`}
              {currentDesignFee.feeType === 'per_sqft' && 'Calculated based on project carpet area.'}
            </div>
          </div>

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
                  Click any item to insert it directly into {currentRoom.name}
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
