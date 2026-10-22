import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, toINR, toPaise, CALCULATION_METHOD_LABELS, UNIT_LABELS } from '../../lib/utils';
import { Layers, Plus, Search, Edit2, Trash2, X, AlertCircle, Tag, Calculator } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'carpentry', label: 'Carpentry & Wardrobes' },
  { id: 'modular_kitchen', label: 'Modular Kitchen' },
  { id: 'furniture', label: 'Furniture & Loose Items' },
  { id: 'false_ceiling', label: 'False Ceiling' },
  { id: 'painting', label: 'Painting & Finishes' },
  { id: 'electrical', label: 'Electrical & Automation' },
  { id: 'lighting', label: 'Architectural Lighting' },
  { id: 'civil_work', label: 'Civil Work & Tiling' },
];

export default function CatalogueView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'carpentry',
    description: '',
    defaultUnit: 'sqft',
    defaultRateINR: '',
    defaultQuantityFormula: 'manual',
    defaultSpecifications: '',
    active: true,
  });

  useEffect(() => {
    loadCatalogue();
  }, [activeCategory]);

  async function loadCatalogue() {
    try {
      setLoading(true);
      const params = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (search) params.search = search;
      const data = await api.getCatalogue(params);
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to load catalogue:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCatalogue();
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: activeCategory !== 'all' ? activeCategory : 'carpentry',
      description: '',
      defaultUnit: 'sqft',
      defaultRateINR: '',
      defaultQuantityFormula: 'manual',
      defaultSpecifications: '',
      active: true,
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'carpentry',
      description: item.description || '',
      defaultUnit: item.defaultUnit || 'sqft',
      defaultRateINR: toINR(item.defaultRate),
      defaultQuantityFormula: item.defaultQuantityFormula || 'manual',
      defaultSpecifications: item.defaultSpecifications || '',
      active: item.active !== false,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Item name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        defaultUnit: formData.defaultUnit,
        defaultRate: toPaise(formData.defaultRateINR),
        defaultQuantityFormula: formData.defaultQuantityFormula,
        defaultSpecifications: formData.defaultSpecifications,
        active: formData.active,
      };

      if (editingItem) {
        await api.updateCatalogueItem(editingItem._id, payload);
      } else {
        await api.createCatalogueItem(payload);
      }
      setModalOpen(false);
      loadCatalogue();
    } catch (err) {
      setError(err.message || 'Failed to save catalogue item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Archive item "${name}" from catalogue?`)) return;
    try {
      await api.deleteCatalogueItem(id);
      loadCatalogue();
    } catch (err) {
      alert(err.message || 'Failed to archive item');
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header & Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
            Materials & Items Catalogue
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
            Predefined materials, rates, and formulas for quick quotation insertion
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                style={{ width: '240px', paddingLeft: '38px', height: '40px' }}
              />
            </div>
            <button type="submit" style={{ background: '#f3efe8', color: '#4b5563', padding: '0 14px', fontWeight: '600' }}>
              Filter
            </button>
          </form>

          <button
            onClick={handleOpenAdd}
            style={{
              background: '#b8860b',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(184, 134, 11, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '16px',
      }}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: isActive ? '700' : '500',
                background: isActive ? '#1f2229' : '#ffffff',
                color: isActive ? '#ffffff' : '#4b5563',
                border: `1px solid ${isActive ? '#1f2229' : '#e8e3d9'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Catalogue Items Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e8e3d9',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading catalogue items...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Layers size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
              No catalogue items in this category
            </h4>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: '16px' }}>
              Add reusable materials with standard rates and measurement formulas.
            </p>
            <button
              onClick={handleOpenAdd}
              style={{ background: '#b8860b', color: '#ffffff', padding: '8px 16px', fontWeight: '600' }}
            >
              <Plus size={16} />
              <span>Add Catalogue Item</span>
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#faf8f5', borderBottom: '1px solid #e8e3d9', color: '#4b5563', fontWeight: '600', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 24px', width: '35%' }}>Item Name & Specs</th>
                <th style={{ padding: '12px 16px', width: '18%' }}>Category</th>
                <th style={{ padding: '12px 16px', width: '12%' }}>Unit</th>
                <th style={{ padding: '12px 16px', width: '15%' }}>Default Rate</th>
                <th style={{ padding: '12px 16px', width: '20%' }}>Formula</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item._id}
                  style={{ borderBottom: '1px solid #f3efe9', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fdfbf7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ fontWeight: '700', color: '#1a1c20', fontSize: '14px' }}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    )}
                    {item.defaultSpecifications && (
                      <div style={{ fontSize: '11px', color: '#8c7851', marginTop: '2px', fontWeight: '500' }}>
                        ⚙️ {item.defaultSpecifications}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#f3efe8',
                      color: '#4b5563',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'capitalize',
                    }}>
                      {item.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '500', color: '#374151' }}>
                    {UNIT_LABELS[item.defaultUnit] || item.defaultUnit}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1a1c20', fontSize: '14px' }}>
                    {formatINR(item.defaultRate)}
                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400', marginLeft: '4px' }}>
                      / {item.defaultUnit}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calculator size={13} style={{ color: '#b8860b' }} />
                      <span>{CALCULATION_METHOD_LABELS[item.defaultQuantityFormula] || item.defaultQuantityFormula}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          background: '#f3efe8',
                          color: '#4b5563',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                        title="Edit Item"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id, item.name)}
                        style={{
                          background: '#fef2f2',
                          color: '#b91c1c',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                        title="Archive Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Add/Edit Item */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e8e3d9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
                {editingItem ? 'Edit Catalogue Item' : 'New Catalogue Item'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ color: '#9ca3af', padding: '4px', borderRadius: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Item Title *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Master Bedroom Sliding Wardrobe (710 Ply + Acrylic)"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="carpentry">Carpentry & Wardrobes</option>
                    <option value="modular_kitchen">Modular Kitchen</option>
                    <option value="furniture">Furniture</option>
                    <option value="false_ceiling">False Ceiling</option>
                    <option value="painting">Painting</option>
                    <option value="electrical">Electrical</option>
                    <option value="lighting">Lighting</option>
                    <option value="civil_work">Civil Work</option>
                    <option value="flooring">Flooring</option>
                    <option value="design_services">Design Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Default Unit *
                  </label>
                  <select
                    value={formData.defaultUnit}
                    onChange={(e) => setFormData({ ...formData, defaultUnit: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  >
                    {Object.entries(UNIT_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Default Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.defaultRateINR}
                    onChange={(e) => setFormData({ ...formData, defaultRateINR: e.target.value })}
                    placeholder="e.g. 1850"
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Default Measurement Formula
                  </label>
                  <select
                    value={formData.defaultQuantityFormula}
                    onChange={(e) => setFormData({ ...formData, defaultQuantityFormula: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    {Object.entries(CALCULATION_METHOD_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Specifications & Material Make
                </label>
                <input
                  type="text"
                  value={formData.defaultSpecifications}
                  onChange={(e) => setFormData({ ...formData, defaultSpecifications: e.target.value })}
                  placeholder="e.g. Century Club Prime 710 BWR, Hafele soft close, 1.5mm edgeband"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Description (Client facing)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed scope and finish description..."
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: '#f3efe8', color: '#4b5563', padding: '9px 16px', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#b8860b',
                    color: '#ffffff',
                    padding: '9px 20px',
                    fontWeight: '600',
                  }}
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
