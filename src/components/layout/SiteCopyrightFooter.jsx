import React from 'react';
import { ArrowUpLeft, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import logo from '../../assets/logo.PNG';

const ENGINEERS_WHATSAPP_URL = `https://wa.me/201019603238?text=${encodeURIComponent('كنت محتاج تفاصيل عن انشاء موقع')}`;

const SiteCopyrightFooter = ({ isArabic, showEngineerContact = true }) => (
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
          <a href="/contact-us" className="site-copyright-footer__contact site-copyright-footer__contact--admin">
            <span className="site-copyright-footer__contact-icon"><UserRound /></span>
            <span><small>{isArabic ? 'الدعم والمساعدة' : 'Support & help'}</small><strong>{isArabic ? 'تواصل مع المسؤول' : 'Contact the admin'}</strong></span>
            <ArrowUpLeft className="site-copyright-footer__arrow" aria-hidden="true" />
          </a>
          <a href={ENGINEERS_WHATSAPP_URL} target="_blank" rel="noreferrer" className="site-copyright-footer__contact">
            <span className="site-copyright-footer__contact-icon"><MessageCircle /></span>
            <span><small>{isArabic ? 'هل تريد تجربة مشابهة؟' : 'Want a similar experience?'}</small><strong>{isArabic ? 'تواصل مع مهندسي البرنامج' : 'Contact the software engineers'}</strong></span>
            <ArrowUpLeft className="site-copyright-footer__arrow" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </div>
  </footer>
);

export default SiteCopyrightFooter;

