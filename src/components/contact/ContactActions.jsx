import React from 'react';
import { ArrowUpLeft, MessageCircle, UserRound } from 'lucide-react';

const ENGINEERS_WHATSAPP_URL = `https://wa.me/201019603238?text=${encodeURIComponent('كنت محتاج تفاصيل عن انشاء موقع')}`;

const ContactActions = ({ isArabic, supportHref = '/contact-us', className = '' }) => (
  <section className={`contact-actions ${className}`.trim()} aria-label={isArabic ? 'خيارات التواصل' : 'Contact options'}>
    <a href={supportHref} className="contact-actions__card contact-actions__card--support" aria-label={isArabic ? 'التواصل مع الدعم' : 'Contact support'}>
      <span className="contact-actions__icon"><UserRound aria-hidden="true" /></span>
      <span className="contact-actions__copy"><small>{isArabic ? 'الدعم والمساعدة' : 'Support & help'}</small><strong>{isArabic ? 'التواصل مع الدعم' : 'Contact support'}</strong></span>
      <ArrowUpLeft className="contact-actions__arrow" aria-hidden="true" />
    </a>
    <a href={ENGINEERS_WHATSAPP_URL} target="_blank" rel="noreferrer" className="contact-actions__card contact-actions__card--development" aria-label={isArabic ? 'التواصل مع فريق التطوير' : 'Contact the development team'}>
      <span className="contact-actions__icon"><MessageCircle aria-hidden="true" /></span>
      <span className="contact-actions__copy"><small>{isArabic ? 'هل تريد تجربة مشابهة؟' : 'Want a similar experience?'}</small><strong>{isArabic ? 'التواصل مع فريق التطوير' : 'Contact the development team'}</strong></span>
      <ArrowUpLeft className="contact-actions__arrow" aria-hidden="true" />
    </a>
  </section>
);

export default ContactActions;
