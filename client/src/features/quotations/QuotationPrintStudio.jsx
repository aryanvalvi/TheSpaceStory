import React, { useState } from 'react';
import {
  Printer,
  ExternalLink,
  Send,
  ArrowLeft,
  Sparkles,
  Sun,
  Crown,
  Trees,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';

const THEMES = [
  {
    id: 'tss_brand',
    name: 'TSS Brand Signature',
    subtitle: 'Champagne Gold & Charcoal (Logo Colors)',
    badge: 'Official Brand',
    icon: Sparkles,
    primaryColor: '#b8860b',
    bgPreview: '#fdfaf4',
    darkAccent: '#1a1c22',
  },
  {
    id: 'minimal_white',
    name: 'Minimalist White',
    subtitle: 'Modern Clean Slate & Crisp White',
    badge: 'Clean Modern',
    icon: Sun,
    primaryColor: '#0f172a',
    bgPreview: '#ffffff',
    darkAccent: '#334155',
  },
  {
    id: 'dark_luxe',
    name: 'Royal Obsidian',
    subtitle: 'Midnight Onyx & Gilded Polished Gold',
    badge: 'Executive Luxe',
    icon: Crown,
    primaryColor: '#d4af37',
    bgPreview: '#121419',
    darkAccent: '#ffd700',
  },
  {
    id: 'nordic_earth',
    name: 'Nordic Architectural',
    subtitle: 'Deep Forest Sage & Warm Terracotta',
    badge: 'Warm Studio',
    icon: Trees,
    primaryColor: '#2d4a3e',
    bgPreview: '#f3f7f5',
    darkAccent: '#a0522d',
  },
];

export default function QuotationPrintStudio({
  quotation,
  calc,
  settings,
  onClose,
  onIssue,
  isReadonly,
  saving,
}) {
  const [selectedTheme, setSelectedTheme] = useState('tss_brand');

  const formatINR = (paise) => {
    if (paise === undefined || paise === null || isNaN(paise)) return '₹0.00';
    const inr = (paise / 100).toFixed(2);
    const [intPart, decPart] = inr.split('.');
    let lastThree = intPart.substring(intPart.length - 3);
    const others = intPart.substring(0, intPart.length - 3);
    const formatted = others !== '' ? others.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
    return `₹${formatted}.${decPart}`;
  };

  const handlePrint = () => {
    const sheet = document.getElementById('tss-printable-sheet');
    if (!sheet) {
      window.print();
      return;
    }

    const oldIframe = document.getElementById('tss-print-iframe');
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'tss-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>The Space Story</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0 !important;
            padding: 12mm 15mm 15mm 15mm !important;
            background: #ffffff !important;
            color: #1a1c20 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #tss-printable-sheet {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body class="theme-${selectedTheme}">
        <div id="tss-printable-sheet" class="theme-${selectedTheme}">
          ${sheet.innerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  };

  const openPdfTab = () => {
    if (quotation._id) {
      window.open(api.getQuotationPdfUrl(quotation._id, selectedTheme), '_blank');
    }
  };

  const client = quotation.clientSnapshot || {};
  const project = quotation.projectSnapshot || {};
  const studioName = settings?.studioName || 'The Space Story';
  const studioPhone = settings?.phone || '+91 98200 12345';
  const studioEmail = settings?.email || 'hello@thespacestory.in';
  const studioGstin = settings?.gstin || '27AABCU9603R1ZX';
  const studioAddr = settings?.address
    ? `${settings.address.line1}, ${settings.address.city}, ${settings.address.state} - ${settings.address.pincode}`
    : 'Studio 402, Design Quarter, Lower Parel, Mumbai - 400013';

  const dateStr = quotation.issueDate
    ? new Date(quotation.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const validUntilStr = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '30 days from issuance';

  const isTaxEnabled = Boolean(quotation.taxConfig?.enabled);

  return (
    <div className="tss-print-studio-container" style={{ minHeight: '100vh', background: '#0e1014', color: '#e5e7eb' }}>
      {/* Top Floating Control Bar (Hidden during print) */}
      <header
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#181b22',
          borderBottom: '1px solid #282c37',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#242936',
              border: '1px solid #363d4e',
              color: '#d1d5db',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Editing</span>
          </button>

          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Quotation Print & Styling Studio</span>
              <span style={{ fontSize: '11px', background: '#b8860b', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Preview & Style
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>
              Select a luxury theme below to preview and print or issue to client
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 2px 10px rgba(184, 134, 11, 0.4)',
            }}
          >
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>

          {quotation._id && (
            <button
              onClick={openPdfTab}
              style={{
                background: '#242936',
                border: '1px solid #363d4e',
                color: '#e5e7eb',
                padding: '9px 15px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Open standalone PDF preview in a new tab"
            >
              <ExternalLink size={15} />
              <span>Open in New Tab</span>
            </button>
          )}

          {!isReadonly && onIssue && (
            <button
              onClick={onIssue}
              disabled={saving}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(22, 163, 74, 0.3)',
              }}
            >
              <Send size={15} />
              <span>{saving ? 'Issuing...' : 'Issue to Client'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Theme Selection Strip (Hidden during print) */}
      <section
        className="no-print"
        style={{
          background: '#12141a',
          borderBottom: '1px solid #232732',
          padding: '16px 28px',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9ca3af', marginBottom: '10px' }}>
            Choose Print Presentation Theme (4 Bespoke Options):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {THEMES.map((th) => {
              const isSelected = selectedTheme === th.id;
              const IconComp = th.icon;
              return (
                <div
                  key={th.id}
                  onClick={() => setSelectedTheme(th.id)}
                  style={{
                    background: isSelected ? '#1e222d' : '#161922',
                    border: isSelected ? `2px solid ${th.primaryColor}` : '1px solid #2c3140',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 16px ${th.primaryColor}33` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: th.primaryColor,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconComp size={16} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                        {th.name}
                      </span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} style={{ color: th.primaryColor }} />
                    )}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#9ca3af', lineHeight: '1.35', marginBottom: '10px' }}>
                    {th.subtitle}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: `${th.primaryColor}22`,
                        color: th.primaryColor,
                        border: `1px solid ${th.primaryColor}55`,
                      }}
                    >
                      {th.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Document Preview Sheet */}
      <main
        style={{
          padding: '40px 20px',
          display: 'flex',
          justifyContent: 'center',
          background: '#0a0c0f',
        }}
      >
        <div
          id="tss-printable-sheet"
          className={`theme-${selectedTheme}`}
          style={{
            width: '100%',
            maxWidth: '920px',
            background: '#ffffff',
            color: '#1a1c20',
            borderRadius: '4px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            padding: '36px 44px',
            boxSizing: 'border-box',
          }}
        >
          {/* Sheet Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `2.5px solid var(--theme-header-border, #b8860b)`,
              paddingBottom: '20px',
              marginBottom: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <img
                src="/logo/TTS.png"
                alt="The Space Story"
                style={{
                  width: '84px',
                  height: '84px',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  background: '#ffffff',
                  padding: '2px',
                }}
              />
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--theme-font-heading, "Cinzel", Georgia, serif)',
                    fontSize: '24px',
                    fontWeight: '700',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--theme-text-main, #1a1c20)',
                    lineHeight: '1.1',
                  }}
                >
                  {studioName}
                </h1>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--theme-primary, #b8860b)',
                    textTransform: 'uppercase',
                    letterSpacing: '1.8px',
                    fontWeight: '700',
                    marginTop: '3px',
                  }}
                >
                  Interior Architecture & Design Firm
                </div>
                <div style={{ fontSize: '11.5px', color: '#555', marginTop: '6px', lineHeight: '1.4' }}>
                  {studioAddr}<br />
                  Phone: {studioPhone} &nbsp;|&nbsp; Email: {studioEmail}<br />
                  {studioGstin && <span>GSTIN: {studioGstin}</span>}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#555' }}>
                Date: <strong>{dateStr}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                Valid Until: <strong>{validUntilStr}</strong>
              </div>
            </div>
          </div>

          {/* Client & Project Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              background: 'var(--theme-info-bg, #faf6ee)',
              border: `1px solid var(--theme-info-border, #ebdcc5)`,
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', color: 'var(--theme-info-title, #996515)', marginBottom: '5px' }}>
                Client Details
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--theme-text-main, #1a1c20)', marginBottom: '3px' }}>
                {client.name || 'Valued Client'}
              </div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.45' }}>
                {client.phone && <div>Phone: {client.phone}</div>}
                {client.email && <div>Email: {client.email}</div>}
                {client.billingAddress && (
                  <div>
                    {[client.billingAddress.line1, client.billingAddress.city, client.billingAddress.pincode].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', color: 'var(--theme-info-title, #996515)', marginBottom: '5px' }}>
                Project Details
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--theme-text-main, #1a1c20)', marginBottom: '3px' }}>
                {project.projectName || 'Interior Design Project'}
              </div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.45' }}>
                <div>Property Type: {project.propertyType || 'Residential'}</div>
                {project.carpetAreaSqFt && <div>Carpet Area: {project.carpetAreaSqFt} sq.ft.</div>}
                {project.siteAddress && (
                  <div>Site: {[project.siteAddress.line1, project.siteAddress.city].filter(Boolean).join(', ')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Room by Room Items Tables */}
          {(quotation.rooms || []).map((room, rIdx) => (
            <div key={room.roomId || rIdx} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
              {/* Room Header Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--theme-room-header-bg, #1d2026)',
                  color: 'var(--theme-room-header-text, #ffffff)',
                  padding: '9px 16px',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: '700',
                  border: `1px solid var(--theme-table-border, #e6dfcf)`,
                  borderBottom: 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--theme-font-heading, "Cinzel", Georgia, serif)', fontSize: '14px', letterSpacing: '0.3px' }}>
                  {rIdx + 1}. {room.name}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--theme-room-subtotal, #f3d082)', fontWeight: '700' }}>
                  {formatINR(room.subtotal || 0)}
                </span>
              </div>

              {/* Items Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `1px solid var(--theme-table-border, #e6dfcf)`,
                  borderTop: 'none',
                  fontSize: '11.5px',
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--theme-table-header-bg, #f7f2e7)', color: 'var(--theme-table-header-text, #453b2d)' }}>
                    <th style={{ width: '4%', padding: '9px 6px', textAlign: 'center', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>#</th>
                    <th style={{ width: '36%', padding: '9px 8px', textAlign: 'left', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>Item Description & Specs</th>
                    <th style={{ width: '16%', padding: '9px 8px', textAlign: 'left', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>Measurement / Formula</th>
                    <th style={{ width: '10%', padding: '9px 8px', textAlign: 'right', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>SQ FT</th>
                    <th style={{ width: '8%', padding: '9px 6px', textAlign: 'center', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>Unit</th>
                    <th style={{ width: '12%', padding: '9px 8px', textAlign: 'right', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>Rate (₹)</th>
                    <th style={{ width: '14%', padding: '9px 10px', textAlign: 'right', borderBottom: `1.5px solid var(--theme-table-border, #e6dfcf)`, textTransform: 'uppercase', fontSize: '10.5px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(room.items || []).map((item, iIdx) => {
                    const d = item.dimensions || {};
                    let dimsStr = '—';
                    if (item.calculationMethod === 'length_x_width' && (d.length || d.width)) {
                      dimsStr = `${d.length || 0} ft × ${d.width || 0} ft`;
                    } else if (item.calculationMethod === 'length_x_height' && (d.length || d.height)) {
                      dimsStr = `${d.length || 0} ft × ${d.height || 0} ft`;
                    } else if (item.calculationMethod === 'length_x_width_x_height' && (d.length || d.width || d.height)) {
                      dimsStr = `${d.length || 0} × ${d.width || 0} × ${d.height || 0} ft`;
                    } else if (item.calculationMethod === 'count_x_per_unit' && (d.count || d.perUnit)) {
                      dimsStr = `${d.count || 0} × ${d.perUnit || 0}/unit`;
                    } else if (d.length || d.width || d.height) {
                      dimsStr = [d.length ? `${d.length}L` : null, d.width ? `${d.width}W` : null, d.height ? `${d.height}H` : null].filter(Boolean).join(' × ') + ' ft';
                    }

                    const isDiminished = item.isOptional && !item.isIncluded;

                    return (
                      <tr
                        key={item.itemId || iIdx}
                        style={{
                          borderBottom: `1px solid var(--theme-table-border, #e6dfcf)`,
                          background: isDiminished ? '#fafafa' : iIdx % 2 === 1 ? 'var(--theme-table-row-alt, #fdfcf9)' : '#ffffff',
                          opacity: isDiminished ? 0.6 : 1,
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px 6px', color: '#666' }}>{iIdx + 1}</td>
                        <td style={{ padding: '8px 8px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--theme-text-main, #1a1c20)', lineHeight: '1.3' }}>
                            {item.name}
                            {item.isOptional && (
                              <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '3px', marginLeft: '6px' }}>
                                Optional
                              </span>
                            )}
                          </div>
                          {item.description && <div style={{ fontSize: '10.5px', color: '#666', marginTop: '2px' }}>{item.description}</div>}
                          {item.specifications && <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}><strong>Specs:</strong> {item.specifications}</div>}
                        </td>
                        <td style={{ padding: '8px 8px', fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                          {dimsStr}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '600' }}>
                          {item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? item.quantity : 0}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '9.5px',
                              fontWeight: '700',
                              background: 'var(--theme-unit-bg, #f4ecdc)',
                              color: 'var(--theme-unit-text, #7c5806)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {(item.unit || 'sqft').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          {formatINR(item.rate || 0)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: 'var(--theme-text-main, #1a1c20)' }}>
                          {isDiminished ? (
                            <span style={{ color: '#999', textDecoration: 'line-through' }}>{formatINR(item.amount || 0)}</span>
                          ) : (
                            formatINR(item.amount || 0)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Design Fees & Summary Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginTop: '26px',
              pageBreakInside: 'avoid',
            }}
          >
            {/* Payment Milestones Box */}
            <div
              style={{
                border: `1px solid var(--theme-info-border, #ebdcc5)`,
                borderRadius: '8px',
                padding: '16px',
                background: 'var(--theme-info-bg, #faf6ee)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--theme-text-main, #1a1c20)', marginBottom: '10px' }}>
                Payment Milestones
              </div>

              {(quotation.paymentMilestones && quotation.paymentMilestones.length > 0) ? (
                quotation.paymentMilestones.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: mIdx === quotation.paymentMilestones.length - 1 ? 'none' : `1px dashed var(--theme-table-border, #e6dfcf)`,
                      fontSize: '11.5px',
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>Stage {mIdx + 1}: {m.description}</span>
                    <span style={{ color: 'var(--theme-primary, #b8860b)', fontWeight: '700' }}>{m.percentage}%</span>
                    <span style={{ fontWeight: '700' }}>{formatINR(m.amount || Math.round((calc.grandTotal * (m.percentage || 0)) / 100))}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '11px', color: '#777' }}>Standard milestone schedule applies.</div>
              )}
            </div>

            {/* Financial Summary Table */}
            <div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  border: `1px solid var(--theme-table-border, #e6dfcf)`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', color: '#555' }}>Rooms Execution Subtotal</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{formatINR(calc.roomsSubtotal || 0)}</td>
                  </tr>

                  {(quotation.designFees || []).map((fee, fIdx) => {
                    let feeDetail = 'Fixed';
                    if (fee.feeType === 'per_sqft') {
                      feeDetail = fee.sqft ? `${fee.sqft} sq.ft. @ ₹${fee.ratePerSqft || 0}/sq.ft.` : `₹${fee.ratePerSqft || 0}/sq.ft.`;
                    }
                    return (
                      <tr key={fIdx}>
                        <td style={{ padding: '8px 12px', color: '#555' }}>
                          {fee.description || 'Design & Architectural Fees'}{' '}
                          <span style={{ fontSize: '10.5px', color: '#888' }}>({feeDetail})</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>
                          {formatINR(fee.calculatedAmount || fee.amount || 0)}
                        </td>
                      </tr>
                    );
                  })}

                  {calc.discountAmount > 0 && (
                    <tr>
                      <td style={{ padding: '8px 12px', color: '#16a34a' }}>Special Discount Applied</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                        - {formatINR(calc.discountAmount)}
                      </td>
                    </tr>
                  )}

                  {isTaxEnabled && (
                    <>
                      <tr style={{ borderTop: `1px solid var(--theme-table-border, #e6dfcf)` }}>
                        <td style={{ padding: '8px 12px', color: '#555' }}>Taxable Base Amount</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>
                          {formatINR(calc.taxableAmount || 0)}
                        </td>
                      </tr>
                      {calc.cgst > 0 && (
                        <>
                          <tr>
                            <td style={{ padding: '6px 12px', color: '#777', fontSize: '11px' }}>Central GST (CGST 9%)</td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '11px' }}>{formatINR(calc.cgst)}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 12px', color: '#777', fontSize: '11px' }}>State GST (SGST 9%)</td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '11px' }}>{formatINR(calc.sgst)}</td>
                          </tr>
                        </>
                      )}
                      {calc.igst > 0 && (
                        <tr>
                          <td style={{ padding: '6px 12px', color: '#777', fontSize: '11px' }}>Integrated GST (IGST 18%)</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '11px' }}>{formatINR(calc.igst)}</td>
                        </tr>
                      )}
                    </>
                  )}

                  {/* Grand Total */}
                  <tr
                    style={{
                      background: 'var(--theme-grand-total-bg, #1a1c22)',
                      color: 'var(--theme-grand-total-text, #d4af37)',
                      fontSize: '14.5px',
                      fontWeight: '700',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--theme-font-heading, "Cinzel", Georgia, serif)' }}>
                      GRAND TOTAL (INR)
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--theme-font-heading, "Cinzel", Georgia, serif)' }}>
                      {formatINR(calc.grandTotal || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms, Inclusions & Exclusions */}
          {((quotation.terms && quotation.terms.length > 0) ||
            (quotation.inclusions && quotation.inclusions.length > 0) ||
            (quotation.exclusions && quotation.exclusions.length > 0)) && (
            <div
              style={{
                marginTop: '26px',
                border: `1px solid var(--theme-table-border, #e6dfcf)`,
                borderRadius: '8px',
                padding: '16px 20px',
                fontSize: '11px',
                color: '#555',
                background: 'var(--theme-info-bg, #faf6ee)',
                pageBreakInside: 'avoid',
              }}
            >
              {quotation.inclusions && quotation.inclusions.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', color: 'var(--theme-text-main, #1a1c20)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Inclusions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {quotation.inclusions.map((inc, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>{inc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {quotation.exclusions && quotation.exclusions.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', color: 'var(--theme-text-main, #1a1c20)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Exclusions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {quotation.exclusions.map((exc, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>{exc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {quotation.terms && quotation.terms.length > 0 && (
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--theme-text-main, #1a1c20)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Terms & Conditions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {quotation.terms.map((term, idx) => (
                      <li key={idx} style={{ marginBottom: '3px' }}>{term}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Signatures */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              marginTop: '45px',
              pageBreakInside: 'avoid',
            }}
          >
            <div>
              <div
                style={{
                  borderTop: `1.5px solid var(--theme-text-main, #1a1c20)`,
                  paddingTop: '8px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  textAlign: 'center',
                  color: 'var(--theme-text-main, #1a1c20)',
                }}
              >
                Client Acceptance Signature & Date
              </div>
            </div>

            <div>
              <div
                style={{
                  borderTop: `1.5px solid var(--theme-text-main, #1a1c20)`,
                  paddingTop: '8px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  textAlign: 'center',
                  color: 'var(--theme-text-main, #1a1c20)',
                }}
              >
                For {studioName} (Authorized Signatory)
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Embedded CSS for Theme Dynamic Injections & Print Mode */}
      <style>{`
        /* Dynamic CSS Variables per Theme */
        .theme-tss_brand {
          --theme-primary: #b8860b;
          --theme-header-border: #b8860b;
          --theme-room-header-bg: linear-gradient(135deg, #1d2026 0%, #292d35 100%);
          --theme-room-header-text: #ffffff;
          --theme-room-subtotal: #f3d082;
          --theme-table-header-bg: #f7f2e7;
          --theme-table-header-text: #453b2d;
          --theme-table-border: #e6dfcf;
          --theme-table-row-alt: #fdfcf9;
          --theme-info-bg: #faf6ee;
          --theme-info-border: #ebdcc5;
          --theme-info-title: #996515;
          --theme-grand-total-bg: linear-gradient(135deg, #1a1c22 0%, #262a33 100%);
          --theme-grand-total-text: #d4af37;
          --theme-unit-bg: #f4ecdc;
          --theme-unit-text: #7c5806;
          --theme-font-heading: 'Cinzel', 'Playfair Display', Georgia, serif;
          --theme-text-main: #191c20;
        }

        .theme-minimal_white {
          --theme-primary: #0f172a;
          --theme-header-border: #0f172a;
          --theme-room-header-bg: #f8fafc;
          --theme-room-header-text: #0f172a;
          --theme-room-subtotal: #0f172a;
          --theme-table-header-bg: #f1f5f9;
          --theme-table-header-text: #334155;
          --theme-table-border: #e2e8f0;
          --theme-table-row-alt: #ffffff;
          --theme-info-bg: #f8fafc;
          --theme-info-border: #e2e8f0;
          --theme-info-title: #334155;
          --theme-grand-total-bg: #0f172a;
          --theme-grand-total-text: #ffffff;
          --theme-unit-bg: #e2e8f0;
          --theme-unit-text: #334155;
          --theme-font-heading: 'Inter', -apple-system, sans-serif;
          --theme-text-main: #0f172a;
        }

        .theme-dark_luxe {
          --theme-primary: #d4af37;
          --theme-header-border: #d4af37;
          --theme-room-header-bg: #121419;
          --theme-room-header-text: #ffffff;
          --theme-room-subtotal: #f3d082;
          --theme-table-header-bg: #191c24;
          --theme-table-header-text: #f3d082;
          --theme-table-border: #dcd3be;
          --theme-table-row-alt: #faf9f6;
          --theme-info-bg: #fbf9f4;
          --theme-info-border: #dcd3be;
          --theme-info-title: #b8860b;
          --theme-grand-total-bg: linear-gradient(135deg, #0f1115 0%, #1a1e26 100%);
          --theme-grand-total-text: #ffd700;
          --theme-unit-bg: #f0e6cf;
          --theme-unit-text: #85610b;
          --theme-font-heading: 'Playfair Display', Georgia, serif;
          --theme-text-main: #111215;
        }

        .theme-nordic_earth {
          --theme-primary: #2d4a3e;
          --theme-header-border: #2d4a3e;
          --theme-room-header-bg: #2d4a3e;
          --theme-room-header-text: #ffffff;
          --theme-room-subtotal: #d1e5db;
          --theme-table-header-bg: #eaf1ed;
          --theme-table-header-text: #213d31;
          --theme-table-border: #d2ddd6;
          --theme-table-row-alt: #f7f9f8;
          --theme-info-bg: #f3f7f5;
          --theme-info-border: #ceddd4;
          --theme-info-title: #a0522d;
          --theme-grand-total-bg: #223a2f;
          --theme-grand-total-text: #edf6f1;
          --theme-unit-bg: #dfebe4;
          --theme-unit-text: #1d4031;
          --theme-font-heading: 'Outfit', -apple-system, sans-serif;
          --theme-text-main: #1f2824;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 15mm 12mm;
          }
          body, html, #root {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          #root > div {
            display: block !important;
            width: 100% !important;
          }
          aside,
          nav,
          header,
          .no-print,
          #sidebar {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
          }
          .tss-print-studio-container {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            width: 100% !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          #tss-printable-sheet {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
