import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User, ArrowRight } from 'lucide-react';

export default function LoginView() {
  const { login, register, error } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please fill in all required fields');
      return;
    }
    if (isRegister && !name.trim()) {
      setLocalError('Please enter your full name');
      return;
    }
    setSubmitting(true);
    setLocalError('');
    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setLocalError(err.message || (isRegister ? 'Registration failed' : 'Invalid credentials'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #181a1f 0%, #252830 50%, #151619 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
      }}>
        {/* Top Gold Accent Bar */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #b8860b, #d4af37, #b8860b)' }} />

        <div style={{ padding: '36px 36px 32px' }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: '#fcfaf7',
              border: '1px solid #ebdcc5',
              borderRadius: '16px',
              marginBottom: '14px',
              padding: '8px',
              boxShadow: '0 4px 12px rgba(184, 134, 11, 0.12)',
            }}>
              <img
                src="/logo/TTS.png"
                alt="The Space Story"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span style="font-weight: 800; font-size: 20px; color: #b8860b;">TSS</span>';
                }}
              />
            </div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1c20',
              letterSpacing: '-0.3px',
              margin: '0 0 4px',
            }}>
              The Space Story
            </h1>
            <p style={{
              fontSize: '12px',
              color: '#8c7851',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600',
              margin: 0,
            }}>
              Interior Design Quotation System
            </p>
          </div>

          {/* Sign In vs Register Tabs */}
          <div style={{
            display: 'flex',
            background: '#f4efe8',
            borderRadius: '8px',
            padding: '3px',
            marginBottom: '20px',
          }}>
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setLocalError('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '13px',
                fontWeight: !isRegister ? '700' : '500',
                background: !isRegister ? '#ffffff' : 'transparent',
                color: !isRegister ? '#1a1c20' : '#6b7280',
                borderRadius: '6px',
                boxShadow: !isRegister ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setLocalError('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '13px',
                fontWeight: isRegister ? '700' : '500',
                background: isRegister ? '#ffffff' : 'transparent',
                color: isRegister ? '#1a1c20' : '#6b7280',
                borderRadius: '6px',
                boxShadow: isRegister ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Create Account
            </button>
          </div>

          {(localError || error) && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>⚠️</span>
              <span>{localError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aryan Valvi"
                    style={{ width: '100%', paddingLeft: '38px', height: '42px' }}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', paddingLeft: '38px', height: '42px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', paddingLeft: '38px', height: '42px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #b8860b 0%, #996515 100%)',
                color: '#ffffff',
                height: '44px',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '8px',
                boxShadow: '0 4px 14px rgba(184, 134, 11, 0.35)',
              }}
            >
              {submitting ? (
                <span>Please wait...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Register & Enter Studio' : 'Sign In to Studio'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
