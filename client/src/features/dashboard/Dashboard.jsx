import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/utils';
import {
  FileText,
  Users,
  Briefcase,
  TrendingUp,
  PlusCircle,
  ExternalLink,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function Dashboard({ onNavigate, onOpenQuotation, onNewQuotation }) {
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [qData, cData, pData] = await Promise.all([
        api.getQuotations({ limit: 10 }),
        api.getClients({ limit: 50 }),
        api.getProjects({ limit: 50 }),
      ]);
      setQuotations(Array.isArray(qData) ? qData : qData.data || []);
      setClients(Array.isArray(cData) ? cData : cData.data || []);
      setProjects(Array.isArray(pData) ? pData : pData.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate high-level pipeline metrics
  const totalValue = quotations.reduce((sum, q) => sum + (q.calculationSnapshot?.grandTotal || 0), 0);
  const issuedQuotations = quotations.filter((q) => q.status === 'issued');
  const approvedQuotations = quotations.filter((q) => q.status === 'approved');
  const draftQuotations = quotations.filter((q) => q.status === 'draft');

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Studio Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1f2229 0%, #2a2d36 100%)',
        borderRadius: '16px',
        padding: '30px 36px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        border: '1px solid #363a45',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(184, 134, 11, 0.2)', color: '#d4af37', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            <Sparkles size={12} />
            The Space Story Studio Suite
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.3px', margin: '0 0 6px' }}>
            Welcome to Quotation Studio
          </h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, maxWidth: '600px' }}>
            Prepare room-wise itemized quotations with instant quantity calculations, customizable design fees, GST compliance, and client-ready PDFs.
          </p>
        </div>
        <button
          onClick={onNewQuotation}
          style={{
            background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 14px rgba(184, 134, 11, 0.4)',
            flexShrink: 0,
          }}
        >
          <PlusCircle size={18} />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {/* Total Pipeline */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '22px',
          border: '1px solid #e8e3d9',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b7280' }}>
                Total Pipeline Value
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a1c20', marginTop: '6px' }}>
                {formatINR(totalValue)}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fcf8ec', color: '#b8860b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#8c7851', marginTop: '12px', fontWeight: '500' }}>
            {quotations.length} total active quotations
          </div>
        </div>

        {/* Quotations Breakdown */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '22px',
          border: '1px solid #e8e3d9',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b7280' }}>
                Quotations Status
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a1c20', marginTop: '6px' }}>
                {quotations.length}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <span className="badge badge-draft">{draftQuotations.length} Draft</span>
            <span className="badge badge-issued">{issuedQuotations.length} Issued</span>
            <span className="badge badge-approved">{approvedQuotations.length} Approved</span>
          </div>
        </div>

        {/* Clients */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '22px',
          border: '1px solid #e8e3d9',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b7280' }}>
                Studio Clients
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a1c20', marginTop: '6px' }}>
                {clients.length}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
          </div>
          <button
            onClick={() => onNavigate('clients')}
            style={{ fontSize: '12px', color: '#b8860b', fontWeight: '600', marginTop: '12px', padding: 0 }}
          >
            Manage client records →
          </button>
        </div>

        {/* Projects */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '22px',
          border: '1px solid #e8e3d9',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#6b7280' }}>
                Active Projects
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a1c20', marginTop: '6px' }}>
                {projects.length}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={20} />
            </div>
          </div>
          <button
            onClick={() => onNavigate('projects')}
            style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', marginTop: '12px', padding: 0 }}
          >
            View ongoing sites →
          </button>
        </div>
      </div>

      {/* Recent Quotations Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e8e3d9',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e8e3d9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1c20', margin: 0 }}>
              Recent Quotations
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '3px 0 0' }}>
              Browse recently generated estimates, drafts, and client approvals
            </p>
          </div>
          <button
            onClick={() => onNavigate('quotations')}
            style={{
              color: '#b8860b',
              fontWeight: '600',
              fontSize: '13px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#fbf8f2',
            }}
          >
            <span>View All Quotations</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading dashboard estimates...
          </div>
        ) : quotations.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: '#d1d5db', marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
              No quotations yet
            </h4>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', marginBottom: '16px' }}>
              Get started by creating your first room-wise quotation for a client.
            </p>
            <button
              onClick={onNewQuotation}
              style={{
                background: '#b8860b',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '600',
              }}
            >
              <PlusCircle size={16} />
              <span>Create First Quotation</span>
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
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr
                    key={q._id}
                    style={{ borderBottom: '1px solid #f3efe9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fdfbf7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 24px', fontWeight: '700', color: '#1a1c20' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{q.quotationNumber}</span>
                        {q.revisionNumber > 1 && (
                          <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#4b5563', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                            R{q.revisionNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151', fontWeight: '500' }}>
                      {q.clientSnapshot?.name || 'Client'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                      {q.projectSnapshot?.projectName || 'Project'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1a1c20' }}>
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
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => onOpenQuotation(q._id)}
                          style={{
                            background: '#f3efe8',
                            color: '#4b5563',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                          }}
                          title="Open Editor"
                        >
                          Open
                        </button>
                        <a
                          href={api.getQuotationPdfUrl(q._id)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#fbf6ec',
                            color: '#b8860b',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                          title="Print / Save PDF"
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
