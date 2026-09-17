import React from 'react';
import { ArrowUpLeft, Bot, Download, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import logo from '../../assets/logo.PNG';
import { ANDROID_APK_DOWNLOAD_URL } from '../../config/appDownloads';

const ENGINEERS_WHATSAPP_URL = `https://wa.me/201019603238?text=${encodeURIComponent('كنت محتاج تفاصيل عن انشاء موقع')}`;

const SiteCopyrightFooter = ({ isArabic, showEngineerContact = true }) => {
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
      {showEngineerContact ? (
        <div className="site-copyright-footer__actions">
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
          <a
            href="/contact-us"
            className="site-copyright-footer__contact site-copyright-footer__contact--admin"
            aria-label={isArabic ? 'التواصل مع الدعم' : 'Contact support'}
          >
            <span className="site-copyright-footer__contact-icon"><UserRound /></span>
            <span><small>{isArabic ? 'الدعم والمساعدة' : 'Support & help'}</small><strong>{isArabic ? 'التواصل مع الدعم' : 'Contact support'}</strong></span>
            <ArrowUpLeft className="site-copyright-footer__arrow" aria-hidden="true" />
          </a>
          <a
            href={ENGINEERS_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="site-copyright-footer__contact"
            aria-label={isArabic ? 'التواصل مع فريق التطوير' : 'Contact the development team'}
          >
            <span className="site-copyright-footer__contact-icon"><MessageCircle /></span>
            <span><small>{isArabic ? 'هل تريد تجربة مشابهة؟' : 'Want a similar experience?'}</small><strong>{isArabic ? 'التواصل مع فريق التطوير' : 'Contact the development team'}</strong></span>
            <ArrowUpLeft className="site-copyright-footer__arrow" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </div>
  </footer>
  );
};

export default SiteCopyrightFooter;
