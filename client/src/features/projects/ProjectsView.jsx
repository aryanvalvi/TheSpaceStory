import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Briefcase, Plus, Search, Building2, MapPin, Edit2, X, AlertCircle, FilePlus } from 'lucide-react';

export default function ProjectsView({ onNewQuotationForProject }) {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    projectName: '',
    clientId: '',
    propertyType: 'apartment',
    carpetAreaSqFt: '',
    status: 'active',
    projectNotes: '',
    siteAddress: {
      line1: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '',
    },
  });

  useEffect(() => {
    loadProjectsAndClients();
  }, []);

  async function loadProjectsAndClients() {
    try {
      setLoading(true);
      const [pData, cData] = await Promise.all([
        api.getProjects({ limit: 100 }),
        api.getClients({ limit: 100 }),
      ]);
      setProjects(Array.isArray(pData) ? pData : pData.data || []);
      setClients(Array.isArray(cData) ? cData : cData.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({
      projectName: '',
      clientId: clients[0]?._id || '',
      propertyType: 'apartment',
      carpetAreaSqFt: '',
      status: 'active',
      projectNotes: '',
      siteAddress: { line1: '', city: 'Mumbai', state: 'Maharashtra', pincode: '' },
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setEditingProject(project);
    setFormData({
      projectName: project.projectName || '',
      clientId: typeof project.clientId === 'object' ? project.clientId?._id : project.clientId,
      propertyType: project.propertyType || 'apartment',
      carpetAreaSqFt: project.carpetAreaSqFt || '',
      status: project.status || 'active',
      projectNotes: project.projectNotes || '',
      siteAddress: {
        line1: project.siteAddress?.line1 || '',
        city: project.siteAddress?.city || 'Mumbai',
        state: project.siteAddress?.state || 'Maharashtra',
        pincode: project.siteAddress?.pincode || '',
      },
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.projectName.trim()) {
      setError('Project name is required');
      return;
    }
    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        carpetAreaSqFt: formData.carpetAreaSqFt ? Number(formData.carpetAreaSqFt) : undefined,
      };
      if (editingProject) {
        await api.updateProject(editingProject._id, payload);
      } else {
        await api.createProject(payload);
      }
      setModalOpen(false);
      loadProjectsAndClients();
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
            Studio Projects & Sites
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
            Manage ongoing residential and commercial interiors
          </p>
        </div>
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
          <span>New Interior Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e8e3d9', padding: '60px 20px', textAlign: 'center' }}>
          <Briefcase size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
            No projects found
          </h4>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: '16px' }}>
            Create an interior project to link clients and generate room-wise quotations.
          </p>
          <button
            onClick={handleOpenAdd}
            style={{ background: '#b8860b', color: '#ffffff', padding: '8px 16px', fontWeight: '600' }}
          >
            <Plus size={16} />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px',
        }}>
          {projects.map((p) => {
            const clientName = typeof p.clientId === 'object' ? p.clientId?.name : 'Client';
            return (
              <div
                key={p._id}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e8e3d9',
                  padding: '22px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#fcf6ec',
                      color: '#b8860b',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}>
                      <Building2 size={12} />
                      <span>{p.propertyType}</span>
                    </div>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      color: p.status === 'active' ? '#16a34a' : '#6b7280',
                      background: p.status === 'active' ? '#f0fdf4' : '#f3f4f6',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}>
                      {p.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1c20', margin: '0 0 6px' }}>
                    {p.projectName}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500', marginBottom: '8px' }}>
                    👤 {clientName}
                  </div>

                  {p.carpetAreaSqFt && (
                    <div style={{ fontSize: '12.5px', color: '#6b7280', marginBottom: '6px' }}>
                      📐 Carpet Area: <strong>{p.carpetAreaSqFt} sq.ft.</strong>
                    </div>
                  )}

                  {p.siteAddress?.line1 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '12px', color: '#787d89' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{p.siteAddress.line1}, {p.siteAddress.city}</span>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3efe9',
                }}>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    style={{ background: '#f3efe8', color: '#4b5563', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => onNewQuotationForProject && onNewQuotationForProject(p)}
                    style={{
                      background: '#fbf6ec',
                      color: '#b8860b',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      borderRadius: '6px',
                    }}
                  >
                    <FilePlus size={14} />
                    <span>Create Quotation</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add/Edit Project */}
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
                {editingProject ? 'Edit Project' : 'New Project'}
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
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g. 4BHK Penthouse - Bandra"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Client *
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">Select a Client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Property Type
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="apartment">Apartment / Flat</option>
                    <option value="villa">Bungalow / Villa</option>
                    <option value="office">Commercial Office</option>
                    <option value="retail">Retail Showroom</option>
                    <option value="other">Other Space</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Carpet Area (Sq. Ft.)
                  </label>
                  <input
                    type="number"
                    value={formData.carpetAreaSqFt}
                    onChange={(e) => setFormData({ ...formData, carpetAreaSqFt: e.target.value })}
                    placeholder="e.g. 1850"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Site Address
                </label>
                <input
                  type="text"
                  value={formData.siteAddress.line1}
                  onChange={(e) => setFormData({
                    ...formData,
                    siteAddress: { ...formData.siteAddress, line1: e.target.value },
                  })}
                  placeholder="Street / Building name (e.g. VBHC Palghar)"
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.siteAddress.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      siteAddress: { ...formData.siteAddress, city: e.target.value },
                    })}
                    placeholder="City"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    value={formData.siteAddress.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      siteAddress: { ...formData.siteAddress, state: e.target.value },
                    })}
                    placeholder="State"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="text"
                    value={formData.siteAddress.pincode}
                    onChange={(e) => setFormData({
                      ...formData,
                      siteAddress: { ...formData.siteAddress, pincode: e.target.value },
                    })}
                    placeholder="Pincode"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                  Site Notes
                </label>
                <textarea
                  value={formData.projectNotes}
                  onChange={(e) => setFormData({ ...formData, projectNotes: e.target.value })}
                  placeholder="Ceiling height, floor number, lift constraints..."
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
                  {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
