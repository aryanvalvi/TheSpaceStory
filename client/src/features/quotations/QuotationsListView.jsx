import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/utils';
import {
  getActiveDraftSummary,
  clearQuotationDraft,
} from '../../lib/quotationDraftStorage';
import {
  FileText,
  Plus,
  Search,
  Printer,
  ChevronRight,
  Sparkles,
  RotateCcw,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  Trash2,
} from 'lucide-react';

export default function QuotationsListView({ onOpenQuotation, onNewQuotation }) {
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [draftSummary, setDraftSummary] = useState(() => getActiveDraftSummary());

  useEffect(() => {
    loadQuotations();
  }, [statusFilter]);

  useEffect(() => {
    // Load projects to display project name for active draft
    api.getProjects({ limit: 100 })
      .then((data) => setProjects(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});

    const handleDraftUpdate = () => {
      setDraftSummary(getActiveDraftSummary());
    };
    window.addEventListener('tss-draft-updated', handleDraftUpdate);
    window.addEventListener('storage', handleDraftUpdate);
    return () => {
      window.removeEventListener('tss-draft-updated', handleDraftUpdate);
      window.removeEventListener('storage', handleDraftUpdate);
    };
  }, []);

  async function loadQuotations() {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const data = await api.getQuotations(params);
      setQuotations(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQuotations();
  };

  const handleIssue = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Issue this quotation? Issued quotations become immutable snapshots.')) return;
    try {
      setActionLoading(true);
      await api.issueQuotation(id);
      loadQuotations();
    } catch (err) {
      alert(err.message || 'Failed to issue quotation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevise = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Create a new revision from this quotation? This will create a new draft revision.')) return;
    try {
      setActionLoading(true);
      const newRev = await api.createRevision(id);
      loadQuotations();
      if (newRev?._id) onOpenQuotation(newRev._id);
    } catch (err) {
      alert(err.message || 'Failed to create revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Mark quotation as Approved by client?')) return;
    try {
      setActionLoading(true);
      await api.approveQuotation(id);
      loadQuotations();
    } catch (err) {
      alert(err.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Mark quotation as Rejected?')) return;
    try {
      setActionLoading(true);
      await api.rejectQuotation(id);
      loadQuotations();
    } catch (err) {
      alert(err.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Cancel this quotation?')) return;
    try {
      setActionLoading(true);
      await api.cancelQuotation(id);
      loadQuotations();
    } catch (err) {
      alert(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const filters = [
    { id: 'all', label: 'All Quotations' },
    { id: 'draft', label: 'Draft' },
    { id: 'issued', label: 'Issued' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Controls */}
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
            Quotations & Estimates
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
            Comprehensive room-wise estimates, lifecycle states, and PDF exports
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
                placeholder="Search by TSS# or client..."
                style={{ width: '240px', paddingLeft: '38px', height: '40px' }}
              />
            </div>
            <button type="submit" style={{ background: '#f3efe8', color: '#4b5563', padding: '0 14px', fontWeight: '600' }}>
              Search
            </button>
          </form>

          <button
            onClick={onNewQuotation}
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
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Active Unsaved Draft Card */}
      {draftSummary && (
        <div style={{
          background: 'linear-gradient(135deg, #fdfbf7 0%, #fbf6ec 100%)',
          border: '1px solid #e8d7b8',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 10px rgba(184, 134, 11, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#b8860b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#1a1c20' }}>
                  Unsaved Quotation Draft in Progress
                </span>
                <span style={{ fontSize: '11px', background: '#e0c58e', color: '#543b0c', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  Stored in Browser
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>
                {projects.find(p => p._id === draftSummary.projectId)?.projectName
                  ? `Project: ${projects.find(p => p._id === draftSummary.projectId)?.projectName} • `
                  : ''}
                {draftSummary.roomsCount} room(s) • {draftSummary.totalItems} item(s)
                {draftSummary.lastModified
                  ? ` • Last modified ${new Date(draftSummary.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                if (confirm('Discard this unsaved quotation draft?')) {
                  clearQuotationDraft('new');
                  setDraftSummary(null);
                }
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e8e3d9',
                color: '#dc2626',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Discard Draft
            </button>
            <button
              onClick={() => onNewQuotation()}
              style={{
                background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(184, 134, 11, 0.25)',
              }}
            >
              <span>Resume Quotation</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {filters.map((f) => {
          const isActive = statusFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                background: isActive ? '#1f2229' : '#ffffff',
                color: isActive ? '#ffffff' : '#4b5563',
                border: `1px solid ${isActive ? '#1f2229' : '#e8e3d9'}`,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Quotations Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e8e3d9',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
              No {statusFilter !== 'all' ? statusFilter : ''} quotations found
            </h4>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: '16px' }}>
              Create an itemized room-wise quotation with live calculations.
            </p>
            <button
              onClick={onNewQuotation}
              style={{ background: '#b8860b', color: '#ffffff', padding: '8px 16px', fontWeight: '600' }}
            >
              <Plus size={16} />
              <span>Create New Quotation</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#faf8f5', borderBottom: '1px solid #e8e3d9', color: '#4b5563', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 24px' }}>Quotation #</th>
                  <th style={{ padding: '12px 16px' }}>Client</th>
                  <th style={{ padding: '12px 16px' }}>Project</th>
                  <th style={{ padding: '12px 16px' }}>Grand Total</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Issued / Date</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Workflow & Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr
                    key={q._id}
                    onClick={() => onOpenQuotation(q._id)}
                    style={{ borderBottom: '1px solid #f3efe9', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fdfbf7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 24px', fontWeight: '700', color: '#1a1c20' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{q.quotationNumber}</span>
                        {q.revisionNumber > 1 && (
                          <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#4b5563', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            Rev {q.revisionNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151', fontWeight: '600' }}>
                      {q.clientSnapshot?.name || 'Client'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                      {q.projectSnapshot?.projectName || 'Project'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: '#1a1c20' }}>
                      {formatINR(q.calculationSnapshot?.grandTotal || 0)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge badge-${q.status}`}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '12.5px' }}>
                      {formatDate(q.issueDate || q.createdAt)}
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenQuotation(q._id)}
                          style={{
                            background: q.status === 'draft' ? '#fdf8ee' : '#f3efe8',
                            color: q.status === 'draft' ? '#b8860b' : '#4b5563',
                            border: q.status === 'draft' ? '1px solid #ebdcc5' : '1px solid transparent',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          {q.status === 'draft' ? 'Edit Draft' : 'View / Edit'}
                        </button>

                        {/* Status Transition Action Buttons */}
                        {q.status === 'draft' && (
                          <button
                            onClick={(e) => handleIssue(q._id, e)}
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              border: '1px solid #bfdbfe',
                            }}
                            title="Issue Quotation"
                          >
                            Issue
                          </button>
                        )}

                        {q.status === 'issued' && (
                          <>
                            <button
                              onClick={(e) => handleRevise(q._id, e)}
                              style={{
                                background: '#fdf4ff',
                                color: '#9333ea',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                border: '1px solid #f0abfc',
                              }}
                              title="Create New Revision"
                            >
                              Revise
                            </button>
                            <button
                              onClick={(e) => handleApprove(q._id, e)}
                              style={{
                                background: '#f0fdf4',
                                color: '#16a34a',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                border: '1px solid #bbf7d0',
                              }}
                              title="Client Approved"
                            >
                              Approve
                            </button>
                          </>
                        )}

                        {/* PDF Print Button */}
                        <a
                          href={api.getQuotationPdfUrl(q._id)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#fbf6ec',
                            color: '#b8860b',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                          title="Print / View PDF"
                        >
                          <Printer size={13} />
                          <span>PDF</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
