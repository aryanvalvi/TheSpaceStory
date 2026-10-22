import { IQuotation } from '../models/Quotation.js';
import { IStudioSettings } from '../models/StudioSettings.js';
import { DEFAULT_LOGO_BASE64 } from './logoBase64.js';

export function formatINR(paise: number): string {
  const inr = (paise / 100).toFixed(2);
  const [integerPart, decimalPart] = inr.split('.');
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `₹${formattedInteger}.${decimalPart}`;
}

export function generateQuotationHtml(
  quotation: IQuotation,
  settings: IStudioSettings | null,
  logoBase64?: string,
  selectedTheme: string = 'tss_brand'
): string {
  const qNum = quotation.quotationNumber || 'QUO-DRAFT';
  const rev = quotation.revisionNumber > 1 ? ` (Rev ${quotation.revisionNumber})` : '';
  const dateStr = quotation.issueDate
    ? new Date(quotation.issueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  const validUntilStr = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '30 days from issuance';

  const studioName = settings?.studioName || 'The Space Story';
  const studioPhone = settings?.phone || '+91 98200 12345';
  const studioEmail = settings?.email || 'hello@thespacestory.in';
  const studioGstin = settings?.gstin || '27AABCU9603R1ZX';
  const studioAddr = settings?.address
    ? `${settings.address.line1}, ${settings.address.city}, ${settings.address.state} - ${settings.address.pincode}`
    : 'Studio 402, Design Quarter, Lower Parel, Mumbai - 400013';

  const logoSrc = logoBase64 || settings?.logoUrl || DEFAULT_LOGO_BASE64;
  const client = quotation.clientSnapshot;
  const project = quotation.projectSnapshot;
  const calc = quotation.calculationSnapshot || ({} as any);

  const roomsHtml = (quotation.rooms || [])
    .map((room, idx) => `
    <div class="room-section">
      <div class="room-header">
        <span class="room-title">${idx + 1}. ${room.name}</span>
        <span class="room-subtotal">${formatINR(room.subtotal || 0)}</span>
      </div>
      <table class="item-table">
        <thead>
          <tr>
            <th style="width: 4%; text-align: center;">#</th>
            <th style="width: 36%; text-align: left;">Item Description & Specifications</th>
            <th style="width: 16%; text-align: left;">Measurement / Formula</th>
            <th style="width: 10%; text-align: right;">SQ FT / Qty</th>
            <th style="width: 8%; text-align: center;">Unit</th>
            <th style="width: 12%; text-align: right;">Rate (₹)</th>
            <th style="width: 14%; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${(room.items || [])
            .map((item, iIdx) => {
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
                dimsStr = [d.length ? `${d.length}L` : null, d.width ? `${d.width}W` : null, d.height ? `${d.height}H` : null]
                  .filter(Boolean)
                  .join(' × ') + ' ft';
              }

              return `
            <tr class="${item.isOptional && !item.isIncluded ? 'item-optional' : ''}">
              <td class="col-center">${iIdx + 1}</td>
              <td class="col-left">
                <div class="item-name">
                  ${item.name || 'Untitled Item'}
                  ${item.isOptional ? '<span class="badge-opt">Optional</span>' : ''}
                </div>
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                ${item.specifications ? `<div class="item-specs"><strong>Specs:</strong> ${item.specifications}</div>` : ''}
              </td>
              <td class="col-left font-mono" style="font-size: 11px; color: var(--text-muted);">${dimsStr}</td>
              <td class="col-right" style="font-weight: 600;">
                ${item.quantity !== undefined && item.quantity !== null && (item.quantity as any) !== '' ? item.quantity : 0}
              </td>
              <td class="col-center">
                <span class="unit-pill">${(item.unit || 'sqft').toUpperCase()}</span>
              </td>
              <td class="col-right">${formatINR(item.rate || 0)}</td>
              <td class="col-right" style="font-weight: 700; color: var(--text-main);">
                ${
                  item.isOptional && !item.isIncluded
                    ? `<span style="color: #999; text-decoration: line-through;">${formatINR(item.amount || 0)}</span>`
                    : formatINR(item.amount || 0)
                }
              </td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  const designFeesHtml = (quotation.designFees || [])
    .map((fee: any) => {
      let feeDetail = 'Fixed';
      if (fee.feeType === 'percentage') {
        feeDetail = `${fee.amount > 100 ? fee.amount / 100 : fee.amount}%`;
      } else if (fee.feeType === 'per_sqft') {
        const ratePaise = fee.ratePerSqft ?? fee.amount;
        feeDetail = fee.sqft
          ? `${fee.sqft} sq.ft. @ ${formatINR(ratePaise)}/sq.ft.`
          : `${formatINR(ratePaise)}/sq.ft.`;
      }
      return `
      <tr>
        <td style="padding: 7px 10px;">${fee.description || 'Interior Designer Professional Fees'} <span style="color: var(--text-muted); font-size: 11px;">(${feeDetail})</span></td>
        <td style="text-align: right; font-weight: 600; padding: 7px 10px;">${formatINR(fee.calculatedAmount || fee.amount || 0)}</td>
      </tr>
    `;
    })
    .join('');

  const milestonesHtml = (quotation.paymentMilestones || [])
    .map((m, i) => `
      <div class="milestone-row">
        <span class="m-stage">Stage ${i + 1}: ${m.description}</span>
        <span class="m-percent">${m.percentage}%</span>
        <span class="m-amount">${formatINR(m.amount || 0)}</span>
      </div>
    `).join('');

  const termsHtml = (quotation.terms || []).map((term) => `<li>${term}</li>`).join('');
  const inclusionsHtml = (quotation.inclusions || []).map((inc) => `<li>${inc}</li>`).join('');
  const exclusionsHtml = (quotation.exclusions || []).map((exc) => `<li>${exc}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The Space Story</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * { box-sizing: border-box; }

    /* ========================================================
       THEME DEFINITIONS
       ======================================================== */
    /* Theme 1: TSS Brand Signature (Warm Gold & Charcoal from Logo) */
    body.theme-tss_brand {
      --primary: #b8860b;
      --primary-dark: #8c6708;
      --primary-light: #fdfaf4;
      --accent: #c59b63;
      --text-main: #191c20;
      --text-muted: #6b6357;
      --header-border: #b8860b;
      --room-header-bg: linear-gradient(135deg, #1d2026 0%, #292d35 100%);
      --room-header-text: #ffffff;
      --room-subtotal-color: #f3d082;
      --table-header-bg: #f7f2e7;
      --table-header-text: #453b2d;
      --table-border: #e6dfcf;
      --table-row-alt: #fdfcf9;
      --info-box-bg: #faf6ee;
      --info-box-border: #ebdcc5;
      --info-title: #996515;
      --grand-total-bg: linear-gradient(135deg, #1a1c22 0%, #262a33 100%);
      --grand-total-text: #d4af37;
      --unit-pill-bg: #f4ecdc;
      --unit-pill-text: #7c5806;
      --font-heading: 'Cinzel', 'Playfair Display', Georgia, serif;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* Theme 2: Modern Minimalist White */
    body.theme-minimal_white {
      --primary: #0f172a;
      --primary-dark: #020617;
      --primary-light: #ffffff;
      --accent: #475569;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --header-border: #0f172a;
      --room-header-bg: #f8fafc;
      --room-header-text: #0f172a;
      --room-subtotal-color: #0f172a;
      --table-header-bg: #f1f5f9;
      --table-header-text: #334155;
      --table-border: #e2e8f0;
      --table-row-alt: #ffffff;
      --info-box-bg: #f8fafc;
      --info-box-border: #e2e8f0;
      --info-title: #334155;
      --grand-total-bg: #0f172a;
      --grand-total-text: #ffffff;
      --unit-pill-bg: #e2e8f0;
      --unit-pill-text: #334155;
      --font-heading: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* Theme 3: Royal Obsidian / Dark Luxe */
    body.theme-dark_luxe {
      --primary: #d4af37;
      --primary-dark: #b89324;
      --primary-light: #ffffff;
      --accent: #ffd700;
      --text-main: #111215;
      --text-muted: #595e6d;
      --header-border: #d4af37;
      --room-header-bg: #121419;
      --room-header-text: #ffffff;
      --room-subtotal-color: #f3d082;
      --table-header-bg: #191c24;
      --table-header-text: #f3d082;
      --table-border: #cfc6b0;
      --table-row-alt: #faf9f6;
      --info-box-bg: #fbf9f4;
      --info-box-border: #dcd3be;
      --info-title: #b8860b;
      --grand-total-bg: linear-gradient(135deg, #0f1115 0%, #1a1e26 100%);
      --grand-total-text: #ffd700;
      --unit-pill-bg: #f0e6cf;
      --unit-pill-text: #85610b;
      --font-heading: 'Playfair Display', Georgia, serif;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* Theme 4: Nordic Architectural (Warm Sage & Earth) */
    body.theme-nordic_earth {
      --primary: #2d4a3e;
      --primary-dark: #1b3329;
      --primary-light: #fcfbf8;
      --accent: #a0522d;
      --text-main: #1f2824;
      --text-muted: #576860;
      --header-border: #2d4a3e;
      --room-header-bg: #2d4a3e;
      --room-header-text: #ffffff;
      --room-subtotal-color: #d1e5db;
      --table-header-bg: #eaf1ed;
      --table-header-text: #213d31;
      --table-border: #d2ddd6;
      --table-row-alt: #f7f9f8;
      --info-box-bg: #f3f7f5;
      --info-box-border: #ceddd4;
      --info-title: #a0522d;
      --grand-total-bg: #223a2f;
      --grand-total-text: #edf6f1;
      --unit-pill-bg: #dfebe4;
      --unit-pill-text: #1d4031;
      --font-heading: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    /* Base Page Styling */
    body {
      font-family: var(--font-body);
      color: var(--text-main);
      background: #ffffff;
      margin: 0;
      padding: 24px 30px;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .top-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      background: #1e2229;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }
    .theme-btn-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .theme-btn {
      background: #2a2e38;
      color: #d1d5db;
      border: 1px solid #3d4251;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .theme-btn.active {
      background: #b8860b;
      color: #ffffff;
      border-color: #d4af37;
    }
    .print-main-btn {
      background: linear-gradient(135deg, #b8860b 0%, #996515 100%);
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(184, 134, 11, 0.4);
    }

    /* Document Header */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid var(--header-border);
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .brand-col {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo {
      width: 78px;
      height: 78px;
      object-fit: contain;
      border-radius: 50%;
      box-shadow: 0 3px 10px rgba(0,0,0,0.12);
      border: 1px solid rgba(0,0,0,0.06);
      background: #ffffff;
      padding: 2px;
      flex-shrink: 0;
    }
    .brand-title {
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-main);
      text-transform: uppercase;
      line-height: 1.1;
    }
    .brand-tagline {
      font-size: 11px;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1.8px;
      font-weight: 600;
      margin-top: 3px;
    }
    .brand-contact {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 5px;
      line-height: 1.4;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .doc-number {
      font-family: var(--font-heading);
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.1;
    }
    .doc-date {
      font-size: 11.5px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .doc-status-badge {
      display: inline-block;
      margin-top: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 3px 9px;
      border-radius: 4px;
      background: var(--primary);
      color: #ffffff;
    }

    /* Info Grid (Client & Project) */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: var(--info-box-bg);
      border: 1px solid var(--info-box-border);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 22px;
    }
    .info-col-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      color: var(--info-title);
      margin-bottom: 5px;
    }
    .info-name {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 3px;
    }
    .info-text {
      font-size: 11.5px;
      color: var(--text-muted);
      line-height: 1.45;
    }

    /* Rooms & Item Tables */
    .room-section {
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--room-header-bg);
      color: var(--room-header-text);
      padding: 9px 15px;
      border-radius: 6px 6px 0 0;
      font-weight: 700;
      border: 1px solid var(--table-border);
      border-bottom: none;
    }
    .room-title {
      font-family: var(--font-heading);
      font-size: 13.5px;
      letter-spacing: 0.3px;
    }
    .room-subtotal {
      font-size: 13.5px;
      color: var(--room-subtotal-color);
      font-weight: 700;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--table-border);
      border-top: none;
    }
    .item-table th {
      background: var(--table-header-bg);
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 8px;
      border-bottom: 1.5px solid var(--table-border);
      color: var(--table-header-text);
    }
    .item-table td {
      padding: 8px 8px;
      border-bottom: 1px solid var(--table-border);
      vertical-align: top;
      font-size: 11.5px;
    }
    .item-table tbody tr:nth-child(even) {
      background: var(--table-row-alt);
    }
    .item-name {
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.3;
    }
    .item-desc {
      font-size: 10.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .item-specs {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 3px;
    }
    .col-center { text-align: center; }
    .col-right { text-align: right; }
    .col-left { text-align: left; }
    .unit-pill {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      background: var(--unit-pill-bg);
      color: var(--unit-pill-text);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-opt {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      background: #fef3c7;
      color: #92400e;
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: 5px;
    }
    .item-optional {
      opacity: 0.6;
      background: #fafafa !important;
    }

    /* Summary & Milestones */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      margin-top: 22px;
      page-break-inside: avoid;
    }
    .milestones-box {
      border: 1px solid var(--info-box-border);
      border-radius: 8px;
      padding: 14px 16px;
      background: var(--info-box-bg);
    }
    .milestone-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 0;
      border-bottom: 1px dashed var(--table-border);
      font-size: 11.5px;
    }
    .milestone-row:last-child { border-bottom: none; }
    .m-stage { font-weight: 500; color: var(--text-main); }
    .m-percent { color: var(--primary); font-weight: 700; }
    .m-amount { font-weight: 700; color: var(--text-main); }

    .financial-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      border: 1px solid var(--table-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .financial-table td {
      padding: 7px 12px;
      border-bottom: 1px solid var(--table-border);
    }
    .financial-table tr:last-child td {
      border-bottom: none;
    }
    .grand-total-row {
      background: var(--grand-total-bg);
      color: #ffffff;
      font-size: 14.5px;
      font-weight: 700;
    }
    .grand-total-row td {
      padding: 12px 12px;
      border: none;
      color: var(--grand-total-text);
      font-family: var(--font-heading);
    }

    /* Terms & Inclusions */
    .terms-box {
      margin-top: 22px;
      border: 1px solid var(--table-border);
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 11px;
      color: var(--text-muted);
      page-break-inside: avoid;
      background: var(--info-box-bg);
    }
    .terms-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .terms-box ul { margin: 0 0 10px; padding-left: 18px; }
    .terms-box li { margin-bottom: 3px; }

    /* Signatures */
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 36px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1.5px solid var(--text-main);
      padding-top: 8px;
      font-size: 11.5px;
      font-weight: 600;
      text-align: center;
      color: var(--text-main);
      margin-top: 45px;
    }

    /* Print media query */
    @media print {
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
      .room-section, .summary-grid, .terms-box, .signature-grid {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body class="theme-${selectedTheme}">
  <div class="no-print top-toolbar">
    <div class="theme-btn-group">
      <span style="font-size: 11.5px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Theme:</span>
      <button class="theme-btn ${selectedTheme === 'tss_brand' ? 'active' : ''}" onclick="setTheme('tss_brand')">
        ✨ 1. TSS Brand Gold
      </button>
      <button class="theme-btn ${selectedTheme === 'minimal_white' ? 'active' : ''}" onclick="setTheme('minimal_white')">
        ⚪ 2. Minimalist White
      </button>
      <button class="theme-btn ${selectedTheme === 'dark_luxe' ? 'active' : ''}" onclick="setTheme('dark_luxe')">
        👑 3. Royal Obsidian
      </button>
      <button class="theme-btn ${selectedTheme === 'nordic_earth' ? 'active' : ''}" onclick="setTheme('nordic_earth')">
        🌿 4. Nordic Sage
      </button>
    </div>
    <div>
      <button class="print-main-btn" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="header-bar">
    <div class="brand-col">
      <img src="${logoSrc}" alt="${studioName}" class="brand-logo" />
      <div>
        <div class="brand-title">${studioName}</div>
        <div class="brand-tagline">Interior Architecture & Design Firm</div>
        <div class="brand-contact">
          ${studioAddr}<br>
          Phone: ${studioPhone} &nbsp;|&nbsp; Email: ${studioEmail}<br>
          ${studioGstin ? `GSTIN: ${studioGstin}` : ''}
        </div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-date">Date: <strong>${dateStr}</strong></div>
      <div class="doc-date">Valid Until: <strong>${validUntilStr}</strong></div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-col-title">Client Details</div>
      <div class="info-name">${client?.name || 'Valued Client'}</div>
      <div class="info-text">
        ${client?.phone ? `Phone: ${client.phone}<br>` : ''}
        ${client?.email ? `Email: ${client.email}<br>` : ''}
        ${
          client?.billingAddress
            ? `${client.billingAddress.line1 || ''}, ${client.billingAddress.city || ''} ${
                client.billingAddress.pincode || ''
              }`
            : ''
        }
      </div>
    </div>
    <div>
      <div class="info-col-title">Project Details</div>
      <div class="info-name">${project?.projectName || 'Interior Design Project'}</div>
      <div class="info-text">
        Property Type: ${project?.propertyType || 'Residential'}<br>
        ${project?.carpetAreaSqFt ? `Carpet Area: ${project.carpetAreaSqFt} sq.ft.<br>` : ''}
        ${
          project?.siteAddress
            ? `Site: ${project.siteAddress.line1 || ''}, ${project.siteAddress.city || ''}`
            : ''
        }
      </div>
    </div>
  </div>

  ${roomsHtml}

  <div class="summary-grid">
    <div class="milestones-box">
      <div class="terms-title">Payment Milestones</div>
      ${milestonesHtml || '<div style="color: var(--text-muted); font-size: 11px;">Standard project milestones apply</div>'}
    </div>

    <div>
      <table class="financial-table">
        <tbody>
          <tr>
            <td style="padding: 7px 10px; color: var(--text-muted);">Rooms Execution Subtotal</td>
            <td style="text-align: right; font-weight: 600; padding: 7px 10px;">${formatINR(calc.roomsSubtotal || 0)}</td>
          </tr>
          ${designFeesHtml}
          ${
            calc.discountAmount > 0
              ? `<tr>
                  <td style="color: #2e7d32; padding: 7px 10px;">Special Discount</td>
                  <td style="text-align: right; color: #2e7d32; font-weight: 600; padding: 7px 10px;">- ${formatINR(
                    calc.discountAmount
                  )}</td>
                </tr>`
              : ''
          }
          ${
            quotation.taxConfig?.enabled
              ? `<tr>
                  <td style="padding: 7px 10px; color: var(--text-muted);">Taxable Base Amount</td>
                  <td style="text-align: right; font-weight: 600; padding: 7px 10px;">${formatINR(calc.taxableAmount || 0)}</td>
                </tr>`
              : ''
          }
          ${
            calc.cgst
              ? `<tr>
                  <td style="padding: 6px 10px; color: var(--text-muted); font-size: 11px;">Central GST (CGST 9%)</td>
                  <td style="text-align: right; padding: 6px 10px; font-size: 11px;">${formatINR(calc.cgst || 0)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; color: var(--text-muted); font-size: 11px;">State GST (SGST 9%)</td>
                  <td style="text-align: right; padding: 6px 10px; font-size: 11px;">${formatINR(calc.sgst || 0)}</td>
                </tr>`
              : ''
          }
          ${
            calc.igst
              ? `<tr>
                  <td style="padding: 6px 10px; color: var(--text-muted); font-size: 11px;">Integrated GST (IGST 18%)</td>
                  <td style="text-align: right; padding: 6px 10px; font-size: 11px;">${formatINR(calc.igst || 0)}</td>
                </tr>`
              : ''
          }
          <tr class="grand-total-row">
            <td>GRAND TOTAL (INR)</td>
            <td style="text-align: right;">${formatINR(calc.grandTotal || 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  ${
    termsHtml || inclusionsHtml || exclusionsHtml
      ? `
  <div class="terms-box">
    ${inclusionsHtml ? `<div class="terms-title">Inclusions</div><ul>${inclusionsHtml}</ul>` : ''}
    ${exclusionsHtml ? `<div class="terms-title">Exclusions</div><ul>${exclusionsHtml}</ul>` : ''}
    ${termsHtml ? `<div class="terms-title">Terms & Conditions</div><ul>${termsHtml}</ul>` : ''}
  </div>
  `
      : ''
  }

  <div class="signature-grid">
    <div>
      <div class="sig-line">Client Acceptance Signature & Date</div>
    </div>
    <div>
      <div class="sig-line">For ${studioName} (Authorized Signatory)</div>
    </div>
  </div>

  <script>
    function setTheme(t) {
      document.body.className = 'theme-' + t;
      document.querySelectorAll('.theme-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      event.target.classList.add('active');
      // Update URL query param without full reload
      if (window.history.pushState) {
        var url = new URL(window.location.href);
        url.searchParams.set('theme', t);
        window.history.pushState(null, '', url.toString());
      }
    }
  </script>
</body>
</html>`;
}
