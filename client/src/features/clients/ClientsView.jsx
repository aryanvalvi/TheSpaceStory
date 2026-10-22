import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function ClientsView() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const data = await api.getClients({ search });
      setClients(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadClients();
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      notes: '',
      billingAddress: { line1: '', line2: '', city: 'Mumbai', state: 'Maharashtra', pincode: '' },
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
      billingAddress: {
        line1: client.billingAddress?.line1 || '',
        line2: client.billingAddress?.line2 || '',
        city: client.billingAddress?.city || 'Mumbai',
        state: client.billingAddress?.state || 'Maharashtra',
        pincode: client.billingAddress?.pincode || '',
      },
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingClient) {
        await api.updateClient(editingClient._id, formData);
      } else {
        await api.createClient(formData);
      }
      setModalOpen(false);
      loadClients();
    } catch (err) {
      setError(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete client "${name}"?`)) return;
    try {
      await api.deleteClient(id);
      loadClients();
    } catch (err) {
      alert(err.message || 'Cannot delete client with linked projects.');
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name, email, phone..."
              style={{ width: '100%', paddingLeft: '38px', height: '40px' }}
            />
          </div>
          <button type="submit" style={{ background: '#f3efe8', color: '#4b5563', padding: '0 16px', fontWeight: '600' }}>
            Search
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
          <span>Add New Client</span>
        </button>
      </div>

      {/* Clients Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e8e3d9',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading clients directory...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Users size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
              No clients found
            </h4>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: '16px' }}>
              Add a client to assign projects and create personalized quotations.
            </p>
            <button
              onClick={handleOpenAdd}
              style={{ background: '#b8860b', color: '#ffffff', padding: '8px 16px', fontWeight: '600' }}
            >
              <Plus size={16} />
              <span>Add First Client</span>
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#faf8f5', borderBottom: '1px solid #e8e3d9', color: '#4b5563', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 24px' }}>Client Name</th>
                <th style={{ padding: '12px 16px' }}>Contact Info</th>
                <th style={{ padding: '12px 16px' }}>Billing Address</th>
                <th style={{ padding: '12px 16px' }}>Created</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c._id}
                  style={{ borderBottom: '1px solid #f3efe9', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fdfbf7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 24px', fontWeight: '700', color: '#1a1c20' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#fcf6ec',
                        color: '#b8860b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '13px',
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{c.name}</div>
                        {c.notes && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>
                            {c.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                        <Phone size={13} style={{ color: '#8c7851' }} />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', marginTop: '2px' }}>
                        <Mail size={13} style={{ color: '#8c7851' }} />
                        <span>{c.email}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '12.5px' }}>
                    {c.billingAddress?.line1 ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <MapPin size={13} style={{ color: '#9ca3af', marginTop: '2px', flexShrink: 0 }} />
                        <span>
                          {c.billingAddress.line1}, {c.billingAddress.city} {c.billingAddress.pincode}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '12.5px' }}>
                    {formatDate(c.createdAt)}
                  </td>
                  <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        style={{
                          background: '#f3efe8',
                          color: '#4b5563',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                        title="Edit Client"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(c._id, c.name)}
                        style={{
                          background: '#fef2f2',
                          color: '#b91c1c',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                        title="Delete Client"
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

      {/* Modal: Add/Edit Client */}
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
            maxWidth: '520px',
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
                {editingClient ? 'Edit Client Record' : 'Register New Client'}
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
                  Client Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Vikram & Ananya Singhania"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98200 00000"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@gmail.com"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Billing Address Line
                </label>
                <input
                  type="text"
                  value={formData.billingAddress.line1}
                  onChange={(e) => setFormData({
                    ...formData,
                    billingAddress: { ...formData.billingAddress, line1: e.target.value },
                  })}
                  placeholder="Apartment, Street address"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, city: e.target.value },
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, state: e.target.value },
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress.pincode}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, pincode: e.target.value },
                    })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Studio Notes (Private)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Preferences, budget discussions, style guidelines..."
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
                    boxShadow: '0 2px 6px rgba(184, 134, 11, 0.3)',
                  }}
                >
                  {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
