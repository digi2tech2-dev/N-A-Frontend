import React from 'react';
import logo from '../../assets/logo.PNG';
import { useLanguage } from '../../context/LanguageContext';

const NavigationOverlay = ({ active }) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <div
      className={`page-transition-overlay${active ? ' is-active' : ''}`}
      aria-hidden={!active}
    >
      <span className="page-transition-overlay__aurora page-transition-overlay__aurora--one" aria-hidden="true" />
      <span className="page-transition-overlay__aurora page-transition-overlay__aurora--two" aria-hidden="true" />
      <div className="page-transition-overlay__stage" role="status" aria-live="polite">
        <div className="page-transition-overlay__orbit" aria-hidden="true">
          <span className="page-transition-overlay__orbit-ring" />
          <span className="page-transition-overlay__orbit-dot" />
          <span className="page-transition-overlay__logo-shell">
            <img
              className="page-transition-overlay__logo"
              src={logo}
              alt=""
              width="72"
              height="72"
            />
          </span>
        </div>
        <div className="page-transition-overlay__brand" aria-hidden="true">
          <strong>N&amp;A</strong>
          <span>HUB</span>
        </div>
        <div className="page-transition-overlay__track" aria-hidden="true">
          <span className="page-transition-overlay__progress" />
        </div>
        <p className="page-transition-overlay__label">
          {isArabic ? 'جارٍ تجهيز الصفحة' : 'Preparing your page'}
          <span aria-hidden="true"><i /><i /><i /></span>
        </p>
        <span className="sr-only">{isArabic ? 'جارٍ تحميل الصفحة' : 'Loading page'}</span>
      </div>
    </div>
  );
};

export default NavigationOverlay;
