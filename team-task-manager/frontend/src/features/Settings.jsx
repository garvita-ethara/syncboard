import React from 'react';
import PageHeader from '../components/PageHeader';
import { navigate } from '../utils/router';
import { useToast } from '../components/ui';

const accents = [
  { name: 'Blue', value: '#346dff' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Slate', value: '#64748b' }
];

export default function Settings({
  theme,
  resolvedTheme,
  setTheme,
  density,
  setDensity,
  accent,
  setAccent,
  onLogout
}) {
  const toast = useToast();

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section>
      <PageHeader title="Settings" />

      <div className="panel" id="appearance-settings">
        <div className="panel-heading"><h2>Appearance</h2></div>
        <p className="muted">Choose your preferred interface theme. Changes apply instantly across the entire workspace.</p>
        <div className="settings-segmented">
          <button className={theme === 'light' ? 'primary' : 'ghost'} type="button" onClick={() => { setTheme('light'); toast?.pushToast({ type: 'success', title: 'Appearance', message: 'Light mode enabled.' }); }}>Light mode</button>
          <button className={theme === 'dark' ? 'primary' : 'ghost'} type="button" onClick={() => { setTheme('dark'); toast?.pushToast({ type: 'success', title: 'Appearance', message: 'Dark mode enabled.' }); }}>Dark mode</button>
          <button className={theme === 'system' ? 'primary' : 'ghost'} type="button" onClick={() => { setTheme('system'); toast?.pushToast({ type: 'success', title: 'Appearance', message: `System mode enabled (${resolvedTheme}).` }); }}>System mode</button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Active theme: <strong>{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</strong></p>
      </div>

      <div className="panel" id="customization-settings">
        <div className="panel-heading"><h2>Customization</h2></div>
        <p className="muted">Adjust accent and spacing density for your preferred working style.</p>

        <div className="settings-group">
          <span className="settings-label">Accent color</span>
          <div className="accent-grid">
            {accents.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`accent-swatch ${accent === item.value ? 'active' : ''}`}
                onClick={() => {
                  setAccent(item.value);
                  toast?.pushToast({ type: 'info', title: 'Customization', message: `Accent switched to ${item.name}.` });
                }}
                aria-label={`Set accent to ${item.name}`}
                title={item.name}
              >
                <span style={{ background: item.value }} />
                <b>{item.name}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <span className="settings-label">Layout density</span>
          <div className="settings-segmented">
            <button className={density === 'comfortable' ? 'primary' : 'ghost'} type="button" onClick={() => { setDensity('comfortable'); toast?.pushToast({ type: 'success', title: 'Layout', message: 'Comfortable layout applied.' }); }}>Comfortable</button>
            <button className={density === 'compact' ? 'primary' : 'ghost'} type="button" onClick={() => { setDensity('compact'); toast?.pushToast({ type: 'success', title: 'Layout', message: 'Compact layout applied.' }); }}>Compact</button>
          </div>
        </div>
      </div>

      <div className="panel" id="account-settings">
        <div className="panel-heading"><h2>Account</h2></div>
        <p className="muted">Manage your profile details, password, and active session.</p>
        <div className="split-actions">
          <button className="secondary" type="button" onClick={() => scrollToSection('account-settings')}>Profile details</button>
          <button className="ghost" type="button" onClick={() => scrollToSection('account-settings')}>Change password</button>
          <button className="ghost logout-btn" type="button" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="panel" id="preferences-settings">
        <div className="panel-heading"><h2>Preferences</h2></div>
        <p className="muted">
          Preferences are saved locally and automatically restored after refresh: theme, accent color, and layout density.
        </p>
        <div className="split-actions">
          <button className="ghost" type="button" onClick={() => scrollToSection('appearance-settings')}>Theme</button>
          <button className="ghost" type="button" onClick={() => scrollToSection('customization-settings')}>Accent</button>
          <button className="ghost" type="button" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
        </div>
      </div>
    </section>
  );
}
