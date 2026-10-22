import React from 'react';
import { Plus, Search, CheckCircle2 } from 'lucide-react';

export default function Header({ title, subtitle, onAction, actionLabel, actionIcon: ActionIcon }) {
  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e8e3d9',
      padding: '16px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a1c20',
            letterSpacing: '-0.2px',
          }}>
            {title}
          </h1>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: '600',
            color: '#16a34a',
            background: '#f0fdf4',
            padding: '2px 8px',
            borderRadius: '12px',
            border: '1px solid #bbf7d0',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
            Live
          </span>
        </div>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onAction && (
          <button
            onClick={onAction}
            style={{
              background: '#b8860b',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '600',
              boxShadow: '0 2px 6px rgba(184, 134, 11, 0.25)',
            }}
          >
            {ActionIcon ? <ActionIcon size={16} /> : <Plus size={16} />}
            <span>{actionLabel || 'Create New'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
