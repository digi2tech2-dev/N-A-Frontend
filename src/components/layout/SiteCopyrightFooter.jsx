import React from 'react';
import { Bot, Download, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import logo from '../../assets/logo.PNG';
import { ANDROID_APK_DOWNLOAD_URL } from '../../config/appDownloads';

const SiteCopyrightFooter = ({ isArabic }) => {
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <footer className="site-copyright-footer mx-auto w-full max-w-[var(--shell-max-width)] px-3 pb-6 sm:px-4 md:px-6 lg:px-8">
    <div className="site-copyright-footer__card">
      <span className="site-copyright-footer__orb site-copyright-footer__orb--one" aria-hidden="true" />
      <span className="site-copyright-footer__orb site-copyright-footer__orb--two" aria-hidden="true" />
      <div className="site-copyright-footer__identity">
        <span className="site-copyright-footer__mark" aria-hidden="true"><img src={logo} alt="" /></span>
        <div>
          <p className="site-copyright-footer__eyebrow">{isArabic ? 'مساحة N&A HUB الرسمية' : 'The official N&A HUB space'}</p>
          <p className="site-copyright-footer__title">N&amp;A <span>HUB</span></p>
        </div>
      </div>
      <div className="site-copyright-footer__copy">
        <p><ShieldCheck aria-hidden="true" /> <strong>{isArabic ? 'حقوق الملكية محفوظة بعناية' : 'Copyright protected'}</strong></p>
        <p>© 2026 N&amp;A HUB · {isArabic ? 'صُنعت الهوية والتجربة لتبقى خاصة بالعلامة.' : 'Brand identity and experience are reserved for this store.'}</p>
      </div>
      {!isNativeApp ? (
        <a
          href={ANDROID_APK_DOWNLOAD_URL}
          download
          className="site-copyright-footer__download"
          aria-label={isArabic ? 'تحميل تطبيق N&A لنظام أندرويد' : 'Download the N&A Android app'}
        >
          <span className="site-copyright-footer__download-icon"><Bot aria-hidden="true" /></span>
          <span>
            <small>{isArabic ? 'تطبيق N&A للأندرويد' : 'N&A Android app'}</small>
            <strong>{isArabic ? 'اضغط هنا لتحميل الابلكيشن' : 'Click here to download the app'}</strong>
          </span>
          <Download className="site-copyright-footer__download-arrow" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  </footer>
  );
};

export default SiteCopyrightFooter;
