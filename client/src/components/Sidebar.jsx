import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Layers,
  Settings,
  LogOut,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getActiveDraftSummary } from '../lib/quotationDraftStorage';

export default function Sidebar({ activeTab, onTabChange, onNewQuotation, onResumeDraft }) {
  const { user, logout } = useAuth();
  const [draftSummary, setDraftSummary] = useState(() => getActiveDraftSummary());

  useEffect(() => {
    const handleDraftChange = () => {
      setDraftSummary(getActiveDraftSummary());
    };
    window.addEventListener('tss-draft-updated', handleDraftChange);
    window.addEventListener('storage', handleDraftChange);
    return () => {
      window.removeEventListener('tss-draft-updated', handleDraftChange);
      window.removeEventListener('storage', handleDraftChange);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'catalogue', label: 'Catalogue Items', icon: Layers },
    { id: 'settings', label: 'Studio Settings', icon: Settings },
  ];

  return (
    <aside className="no-print" style={{
      width: '260px',
      background: '#191b20',
      color: '#e2e4e9',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #282b33',
      flexShrink: 0,
      minHeight: '100vh',
    }}>
      {/* Studio Header & Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid #282b33',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          background: '#23262d',
          borderRadius: '10px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #363a45',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          <img
            src="/logo/TTS.png"
            alt="The Space Story"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<span style="font-weight: 800; font-size: 14px; color: #b8860b;">TSS</span>';
            }}
          />
        </div>
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '0.2px',
            lineHeight: 1.2,
          }}>
            The Space Story
          </div>
          <div style={{
            fontSize: '11px',
            color: '#b8860b',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontWeight: '600',
            marginTop: '2px',
          }}>
            Design Studio
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div style={{ padding: '16px 16px 8px' }}>
        <button
          onClick={onNewQuotation}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(184, 134, 11, 0.25)',
          }}
        >
          <PlusCircle size={16} />
          <span>New Quotation</span>
        </button>

        {draftSummary && onResumeDraft && (
          <button
            onClick={onResumeDraft}
            title="Resume editing unsaved quotation draft"
            style={{
              width: '100%',
              marginTop: '8px',
              background: '#23262d',
              border: '1px solid #b8860b',
              color: '#f59e0b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
              <span>Resume Draft</span>
            </div>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{draftSummary.totalItems} items</span>
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: '#656a76',
          fontWeight: '600',
          padding: '4px 12px 8px',
        }}>
          Main Menu
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isQuotationsTab = item.id === 'quotations';
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? '#ffffff' : '#9ca3af',
                    background: isActive ? '#262932' : 'transparent',
                    borderLeft: isActive ? '3px solid #b8860b' : '3px solid transparent',
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? '#b8860b' : '#6b7280' }} />
                  <span>{item.label}</span>
                  {isQuotationsTab && draftSummary && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '10px',
                      background: 'rgba(184, 134, 11, 0.2)',
                      color: '#f59e0b',
                      border: '1px solid rgba(184, 134, 11, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: '700',
                    }}>
                      Draft
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section & Logout */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #282b33',
        background: '#151619',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#b8860b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '13px',
              flexShrink: 0,
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user?.name || 'Studio Designer'}
              </div>
              <div style={{ fontSize: '11px', color: '#8c7851', textTransform: 'capitalize' }}>
                {user?.role || 'owner'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            style={{
              color: '#9ca3af',
              padding: '6px',
              borderRadius: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
