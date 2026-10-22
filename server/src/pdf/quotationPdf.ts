import { IQuotation } from '../models/Quotation.js';
import { IStudioSettings } from '../models/StudioSettings.js';

export function formatINR(paise: number): string {
  const inr = (paise / 100).toFixed(2);
  const [integerPart, decimalPart] = inr.split('.');
  // Indian number formatting: last 3 digits, then groups of 2
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
  logoBase64?: string
): string {
  const qNum = quotation.quotationNumber;
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

  const client = quotation.clientSnapshot;
  const project = quotation.projectSnapshot;
  const calc = quotation.calculationSnapshot || ({} as any);

  const roomsHtml = (quotation.rooms || [])
    .map(
      (room, idx) => `
    <div class="room-section">
      <div class="room-header">
        <span class="room-title">${idx + 1}. ${room.name}</span>
        <span class="room-subtotal">${formatINR(room.subtotal || 0)}</span>
      </div>
      <table class="item-table">
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 45%">Description & Specification</th>
            <th style="width: 12%">Qty</th>
            <th style="width: 13%">Unit</th>
            <th style="width: 12%">Rate</th>
            <th style="width: 13%; text-align: right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(room.items || [])
            .map(
              (item, iIdx) => `
            <tr class="${item.isOptional && !item.isIncluded ? 'item-optional' : ''}">
              <td class="col-center">${iIdx + 1}</td>
              <td>
                <div class="item-name">${item.name} ${
                item.isOptional ? '<span class="badge-opt">Optional</span>' : ''
              }</div>
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                ${
                  item.specifications
                    ? `<div class="item-specs"><strong>Specs:</strong> ${item.specifications}</div>`
                    : ''
                }
                ${
                  item.dimensions && (item.dimensions.length || item.dimensions.width || item.dimensions.height)
                    ? `<div class="item-specs" style="color: #777; font-size: 11px; margin-top: 2px;"><strong>Dimensions:</strong> ${[
                        item.dimensions.length ? `L: ${item.dimensions.length} ft` : null,
                        item.dimensions.width ? `W: ${item.dimensions.width} ft` : null,
                        item.dimensions.height ? `H: ${item.dimensions.height} ft` : null,
                      ]
                        .filter(Boolean)
                        .join(' × ')}</div>`
                    : ''
                }
              </td>
              <td class="col-center">${item.quantity}</td>
              <td class="col-center">${item.unit}</td>
              <td class="col-right">${formatINR(item.rate)}</td>
              <td class="col-right" style="font-weight: 600">
                ${
                  item.isOptional && !item.isIncluded
                    ? `<span style="color: #999; text-decoration: line-through">${formatINR(
                        item.amount
                      )}</span>`
                    : formatINR(item.amount)
                }
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
    )
    .join('');

  const designFeesHtml = (quotation.designFees || [])
    .map(
      (fee) => `
      <tr>
        <td>${fee.description || 'Design & Architectural Supervision'} (${
          fee.feeType === 'percentage'
            ? `${fee.amount > 100 ? fee.amount / 100 : fee.amount}%`
            : fee.feeType === 'per_sqft'
            ? `${formatINR(fee.amount)}/sq.ft.`
            : 'Fixed'
        })</td>
        <td style="text-align: right; font-weight: 600">${formatINR(fee.calculatedAmount || 0)}</td>
      </tr>
    `
    )
    .join('');

  const milestonesHtml = (quotation.paymentMilestones || [])
    .map(
      (m, i) => `
      <div class="milestone-row">
        <span class="m-stage">Stage ${i + 1}: ${m.description}</span>
        <span class="m-percent">${m.percentage}%</span>
        <span class="m-amount">${formatINR(m.amount)}</span>
      </div>
    `
    )
    .join('');

  const termsHtml = (quotation.terms || [])
    .map((term, i) => `<li>${term}</li>`)
    .join('');

  const inclusionsHtml = (quotation.inclusions || [])
    .map((inc) => `<li>${inc}</li>`)
    .join('');

  const exclusionsHtml = (quotation.exclusions || [])
    .map((exc) => `<li>${exc}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${qNum}${rev} — The Space Story</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e1e1e;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #b8860b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #1a1a1a;
      text-transform: uppercase;
    }
    .brand-tagline {
      font-size: 11px;
      color: #8c7851;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 2px;
    }
    .brand-contact {
      font-size: 11px;
      color: #555;
      margin-top: 6px;
      line-height: 1.4;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-number {
      font-size: 18px;
      font-weight: 700;
      color: #b8860b;
    }
    .doc-date {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #fdfbf7;
      border: 1px solid #e8e2d5;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .info-col-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      color: #8c7851;
      margin-bottom: 6px;
    }
    .info-name {
      font-size: 15px;
      font-weight: 600;
      color: #222;
      margin-bottom: 4px;
    }
    .info-text {
      font-size: 12px;
      color: #555;
      line-height: 1.4;
    }
    .room-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #2a2825;
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 4px 4px 0 0;
      font-weight: 600;
    }
    .room-title { font-size: 14px; }
    .room-subtotal { font-size: 14px; color: #f5deb3; }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e0ded9;
      border-top: none;
    }
    .item-table th {
      background: #f4efe6;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px;
      border-bottom: 1px solid #d5cebf;
      color: #4a463e;
      text-align: left;
    }
    .item-table td {
      padding: 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
      font-size: 12px;
    }
    .item-name { font-weight: 600; color: #222; }
    .item-desc { font-size: 11px; color: #666; margin-top: 2px; }
    .item-specs { font-size: 10px; color: #777; margin-top: 2px; }
    .col-center { text-align: center; }
    .col-right { text-align: right; }
    .badge-opt {
      display: inline-block;
      font-size: 9px;
      text-transform: uppercase;
      background: #fff3cd;
      color: #856404;
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: 6px;
    }
    .item-optional {
      opacity: 0.6;
      background: #fafafa;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .milestones-box {
      border: 1px solid #e8e2d5;
      border-radius: 6px;
      padding: 14px;
      background: #fdfbf7;
    }
    .milestone-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #ded8cb;
      font-size: 12px;
    }
    .milestone-row:last-child { border-bottom: none; }
    .m-stage { font-weight: 500; }
    .m-percent { color: #8c7851; font-weight: 600; }
    .m-amount { font-weight: 600; }
    .financial-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .financial-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #eee;
    }
    .grand-total-row {
      background: #2a2825;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
    }
    .grand-total-row td {
      padding: 12px 10px;
      border: none;
      color: #f5deb3;
    }
    .terms-box {
      margin-top: 24px;
      border: 1px solid #e0ded9;
      border-radius: 6px;
      padding: 14px;
      font-size: 11px;
      color: #555;
      page-break-inside: avoid;
    }
    .terms-title {
      font-size: 12px;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .terms-box ul { margin: 0; padding-left: 18px; }
    .terms-box li { margin-bottom: 4px; }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1px solid #333;
      padding-top: 6px;
      font-size: 12px;
      text-align: center;
      color: #444;
      margin-top: 50px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #b8860b; color: white; border: none; padding: 8px 18px; border-radius: 4px; font-weight: 600; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="header-bar">
    <div>
      <div class="brand-title">${studioName}</div>
      <div class="brand-tagline">Interior Architecture & Design Studio</div>
      <div class="brand-contact">
        ${studioAddr}<br>
        Phone: ${studioPhone} | Email: ${studioEmail}<br>
        GSTIN: ${studioGstin}
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-number">${qNum}${rev}</div>
      <div class="doc-date">Date: <strong>${dateStr}</strong></div>
      <div class="doc-date">Valid Until: <strong>${validUntilStr}</strong></div>
      <div class="doc-date" style="text-transform: uppercase; margin-top: 4px; font-weight: 600; color: #b8860b">
        Status: ${quotation.status}
      </div>
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
      ${milestonesHtml || '<div style="color: #888">Standard project milestones apply</div>'}
    </div>

    <div>
      <table class="financial-table">
        <tbody>
          <tr>
            <td>Rooms Subtotal</td>
            <td style="text-align: right; font-weight: 600">${formatINR(calc.roomsSubtotal || 0)}</td>
          </tr>
          ${designFeesHtml}
          ${
            calc.discountAmount > 0
              ? `<tr>
                  <td style="color: #2e7d32">Discount</td>
                  <td style="text-align: right; color: #2e7d32; font-weight: 600">- ${formatINR(
                    calc.discountAmount
                  )}</td>
                </tr>`
              : ''
          }
          <tr>
            <td>Taxable Amount</td>
            <td style="text-align: right">${formatINR(calc.taxableAmount || 0)}</td>
          </tr>
          ${
            calc.cgst
              ? `<tr>
                  <td>CGST (9%)</td>
                  <td style="text-align: right">${formatINR(calc.cgst || 0)}</td>
                </tr>
                <tr>
                  <td>SGST (9%)</td>
                  <td style="text-align: right">${formatINR(calc.sgst || 0)}</td>
                </tr>`
              : ''
          }
          ${
            calc.igst
              ? `<tr>
                  <td>IGST (18%)</td>
                  <td style="text-align: right">${formatINR(calc.igst || 0)}</td>
                </tr>`
              : ''
          }
          <tr class="grand-total-row">
            <td>GRAND TOTAL (INR)</td>
            <td style="text-align: right">${formatINR(calc.grandTotal || 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  ${
    termsHtml || inclusionsHtml || exclusionsHtml
      ? `
  <div class="terms-box">
    ${inclusionsHtml ? `<div class="terms-title">Inclusions</div><ul>${inclusionsHtml}</ul><br>` : ''}
    ${exclusionsHtml ? `<div class="terms-title">Exclusions</div><ul>${exclusionsHtml}</ul><br>` : ''}
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
</body>
</html>`;
}
