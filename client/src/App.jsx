import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './features/auth/LoginView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './features/dashboard/Dashboard';
import QuotationsListView from './features/quotations/QuotationsListView';
import QuotationEditor from './features/quotations/QuotationEditor';
import ClientsView from './features/clients/ClientsView';
import ProjectsView from './features/projects/ProjectsView';
import CatalogueView from './features/catalogue/CatalogueView';
import SettingsView from './features/settings/SettingsView';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('tss_active_tab');
      return savedTab || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [editingQuotationId, setEditingQuotationId] = useState(() => {
    try {
      return localStorage.getItem('tss_editing_quotation_id') || null;
    } catch {
      return null;
    }
  });
  const [initialProjectId, setInitialProjectId] = useState(() => {
    try {
      return localStorage.getItem('tss_editing_project_id') || null;
    } catch {
      return null;
    }
  });

  // Keep navigation and editing state synchronized with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tss_active_tab', activeTab);
      if (editingQuotationId) {
        localStorage.setItem('tss_editing_quotation_id', editingQuotationId);
      } else {
        localStorage.removeItem('tss_editing_quotation_id');
      }
      if (initialProjectId) {
        localStorage.setItem('tss_editing_project_id', initialProjectId);
      } else {
        localStorage.removeItem('tss_editing_project_id');
      }
    } catch (e) {
      console.warn('Failed to update tab storage:', e);
    }
  }, [activeTab, editingQuotationId, initialProjectId]);

  useEffect(() => {
    if (activeTab === 'editor' && !editingQuotationId) {
      setEditingQuotationId('new');
    }
  }, [activeTab, editingQuotationId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#191b20',
        color: '#ffffff',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '16px',
          background: '#23262d',
          border: '1px solid #363a45',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <img
            src="/logo/TTS.png"
            alt="The Space Story"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<span style="font-weight: 800; font-size: 18px; color: #b8860b;">TSS</span>';
            }}
          />
        </div>
        <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>
          The Space Story
        </div>
        <div style={{ fontSize: '12px', color: '#8c7851', marginTop: '4px' }}>
          Loading design studio workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleOpenQuotation = (id) => {
    setEditingQuotationId(id);
    setActiveTab('editor');
  };

  const handleNewQuotation = () => {
    setEditingQuotationId('new');
    setActiveTab('editor');
  };

  const handleNewQuotationForProject = (project) => {
    const pId = typeof project === 'object' ? project?._id : project;
    setInitialProjectId(pId || null);
    setEditingQuotationId('new');
    setActiveTab('editor');
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Design Studio Overview',
          subtitle: 'Active quotations, pipeline performance, and ongoing sites',
          actionLabel: 'New Quotation',
          onAction: handleNewQuotation,
        };
      case 'quotations':
        return {
          title: 'Quotations Directory',
          subtitle: 'Draft, issued, and approved interior estimates',
          actionLabel: 'New Quotation',
          onAction: handleNewQuotation,
        };
      case 'clients':
        return {
          title: 'Clients Directory',
          subtitle: 'Client portfolio and site records',
        };
      case 'projects':
        return {
          title: 'Project Sites',
          subtitle: 'Residential and commercial interior projects',
        };
      case 'catalogue':
        return {
          title: 'Materials Catalogue',
          subtitle: 'Standard woodwork, finishes, and unit rates',
        };
      case 'settings':
        return {
          title: 'Studio Settings',
          subtitle: 'Branding, GST registration, and default quotation terms',
        };
      case 'editor':
        return {
          title: editingQuotationId === 'new' ? 'Create New Quotation' : 'Quotation Editor',
          subtitle: 'Room-wise line items, measurement formulas, and financial calculation engine',
        };
      default:
        return { title: 'The Space Story', subtitle: 'Interior Architecture Studio' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f6f2' }}>
      <Sidebar
        activeTab={activeTab === 'editor' ? 'quotations' : activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setEditingQuotationId(null);
        }}
        onNewQuotation={handleNewQuotation}
        onResumeDraft={() => {
          setEditingQuotationId('new');
          setActiveTab('editor');
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeTab !== 'editor' && (
          <Header
            title={headerInfo.title}
            subtitle={headerInfo.subtitle}
            onAction={headerInfo.onAction}
            actionLabel={headerInfo.actionLabel}
          />
        )}

        <main style={{ flex: 1 }}>
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenQuotation={handleOpenQuotation}
              onNewQuotation={handleNewQuotation}
            />
          )}

          {activeTab === 'quotations' && (
            <QuotationsListView
              onOpenQuotation={handleOpenQuotation}
              onNewQuotation={handleNewQuotation}
            />
          )}

          {activeTab === 'clients' && <ClientsView />}

          {activeTab === 'projects' && (
            <ProjectsView onNewQuotationForProject={handleNewQuotationForProject} />
          )}

          {activeTab === 'catalogue' && <CatalogueView />}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'editor' && (
            <QuotationEditor
              quotationId={editingQuotationId}
              initialProjectId={initialProjectId}
              onBack={() => {
                setActiveTab('quotations');
                setEditingQuotationId(null);
                setInitialProjectId(null);
              }}
              onSaved={() => {
                setInitialProjectId(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
