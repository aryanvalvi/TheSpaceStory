import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Settings, Save, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({
    studioName: 'The Space Story',
    phone: '',
    email: '',
    gstin: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
    },
    defaultQuotationValidityDays: 30,
    defaultTerms: [],
    defaultInclusions: [],
    defaultExclusions: [],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await api.getStudioSettings();
      if (data) {
        setSettings({
          studioName: data.studioName || 'The Space Story',
          phone: data.phone || '',
          email: data.email || '',
          gstin: data.gstin || '',
          address: {
            line1: data.address?.line1 || '',
            line2: data.address?.line2 || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            pincode: data.address?.pincode || '',
          },
          defaultQuotationValidityDays: data.defaultQuotationValidityDays || 30,
          defaultTerms: data.defaultTerms || [],
          defaultInclusions: data.defaultInclusions || [],
          defaultExclusions: data.defaultExclusions || [],
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.updateStudioSettings(settings);
      setSuccessMsg('Studio settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTerm = () => {
    setSettings((prev) => ({
      ...prev,
      defaultTerms: [...prev.defaultTerms, 'New standard term or condition'],
    }));
  };

  const handleUpdateTerm = (index, value) => {
    const terms = [...settings.defaultTerms];
    terms[index] = value;
    setSettings({ ...settings, defaultTerms: terms });
  };

  const handleDeleteTerm = (index) => {
    setSettings({
      ...settings,
      defaultTerms: settings.defaultTerms.filter((_, i) => i !== index),
    });
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
            Studio Profile & Master Settings
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
            Branding, tax registration, and default boilerplate terms for generated quotations & PDFs
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#b8860b',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(184, 134, 11, 0.25)',
          }}
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

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

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Studio Branding & Contact */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e8e3d9', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1c20', margin: '0 0 16px' }}>
            Studio Identification & Contact
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Studio Trading Name
              </label>
              <input
                type="text"
                value={settings.studioName}
                onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                GSTIN Number (Tax Registration)
              </label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                placeholder="27AABCU9603R1ZX"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Studio Support Phone
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 98200 12345"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Official Email Address
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="hello@thespacestory.in"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Studio Address
            </label>
            <input
              type="text"
              value={settings.address.line1}
              onChange={(e) => setSettings({
                ...settings,
                address: { ...settings.address, line1: e.target.value },
              })}
              placeholder="Studio 402, Design Quarter, Lower Parel"
              style={{ width: '100%', marginBottom: '10px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                value={settings.address.city}
                onChange={(e) => setSettings({
                  ...settings,
                  address: { ...settings.address, city: e.target.value },
                })}
                placeholder="City"
                style={{ width: '100%' }}
              />
              <input
                type="text"
                value={settings.address.state}
                onChange={(e) => setSettings({
                  ...settings,
                  address: { ...settings.address, state: e.target.value },
                })}
                placeholder="State"
                style={{ width: '100%' }}
              />
              <input
                type="text"
                value={settings.address.pincode}
                onChange={(e) => setSettings({
                  ...settings,
                  address: { ...settings.address, pincode: e.target.value },
                })}
                placeholder="Pincode"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Quotation Defaults */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e8e3d9', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1c20', margin: '0 0 16px' }}>
            Quotation Defaults
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Default Validity (Days)
              </label>
              <input
                type="number"
                value={settings.defaultQuotationValidityDays}
                onChange={(e) => setSettings({
                  ...settings,
                  defaultQuotationValidityDays: Number(e.target.value) || 30,
                })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Default GST Rate (%)
              </label>
              <input
                type="number"
                value={18}
                disabled
                style={{ width: '100%', background: '#fafafa', color: '#6b7280' }}
              />
            </div>
          </div>
        </div>

        {/* Standard Terms & Conditions */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e8e3d9', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
              Standard Terms & Conditions
            </h3>
            <button
              type="button"
              onClick={handleAddTerm}
              style={{ background: '#f3efe8', color: '#4b5563', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
            >
              <Plus size={14} />
              <span>Add Term</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {settings.defaultTerms.map((term, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => handleUpdateTerm(idx, e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteTerm(idx)}
                  style={{ color: '#ef4444', padding: '6px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
