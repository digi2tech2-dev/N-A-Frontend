import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Headphones, MessageCircleMore, Phone, X } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { isAdminRole } from '../../utils/authRoles';
import { buildWhatsAppLink, getAdminWhatsAppNumber } from '../../utils/whatsapp';
import floatingPromoOne from '../../assets/عائم1.PNG';
import floatingPromoTwo from '../../assets/عائم2.PNG';

const FloatingWhatsApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [isPromoPaused, setIsPromoPaused] = useState(false);
  const supportRef = useRef(null);
  const promoTouchStartRef = useRef(null);
  const { i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();
  const shouldHideForRole = isAdminRole(user?.role);
  const isAuthPage = ['/auth', '/login', '/', '/welcome', '/onboarding'].includes(location.pathname);

  const isArabic = String(i18n.resolvedLanguage || i18n.language || 'ar')
    .toLowerCase()
    .startsWith('ar');

  const message = isArabic
    ? 'مرحباً، أحتاج مساعدة من فريق N&A HUB'
    : 'Hello, I need help from the N&A HUB team';
  const href = buildWhatsAppLink({
    number: getAdminWhatsAppNumber(),
    message,
  });
  const supportNumber = getAdminWhatsAppNumber();
  const callHref = `tel:+${supportNumber}`;
  const tooltipText = isArabic ? 'خدمة العملاء' : 'Customer support';
  const promoSlides = [
    {
      image: floatingPromoTwo,
      to: '/wallet/add-balance',
      label: isArabic ? 'فتح الإيداع الآلي' : 'Open automatic deposit',
    },
    {
      image: floatingPromoOne,
      to: '/referral',
      label: isArabic ? 'رابط الإحالة اكسب واسحب' : 'Earn and withdraw with referrals',
    },
  ];
  const activePromo = promoSlides[activePromoIndex];

  const showPreviousPromo = () => {
    setActivePromoIndex((current) => (current - 1 + promoSlides.length) % promoSlides.length);
  };

  const showNextPromo = () => {
    setActivePromoIndex((current) => (current + 1) % promoSlides.length);
  };

  const handlePromoTouchStart = (event) => {
    promoTouchStartRef.current = event.touches[0]?.clientX ?? null;
  };

  const handlePromoTouchEnd = (event) => {
    const startX = promoTouchStartRef.current;
    const endX = event.changedTouches[0]?.clientX;
    promoTouchStartRef.current = null;

    if (startX === null || endX === undefined || Math.abs(endX - startX) < 32) return;
    if (endX < startX) {
      showNextPromo();
    } else {
      showPreviousPromo();
    }
  };

  useEffect(() => {
    setIsOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (isOpen || isPromoPaused || promoSlides.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActivePromoIndex((current) => (current + 1) % promoSlides.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [isOpen, isPromoPaused, promoSlides.length]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!supportRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (shouldHideForRole || isAuthPage) {
    return null;
  }

  return (
    <div ref={supportRef} className={`floating-whatsapp${isOpen ? ' is-open' : ''}`}>
      <div
        className="floating-whatsapp-promos"
        aria-label={isArabic ? 'عروض المحفظة' : 'Wallet promotions'}
      >
        <div
          className="floating-whatsapp-promo-slider"
          onMouseEnter={() => setIsPromoPaused(true)}
          onMouseLeave={() => setIsPromoPaused(false)}
          onFocusCapture={() => setIsPromoPaused(true)}
          onBlurCapture={() => setIsPromoPaused(false)}
          onTouchStart={handlePromoTouchStart}
          onTouchEnd={handlePromoTouchEnd}
        >
          <Link
            key={activePromo.image}
            to={activePromo.to}
            className="floating-whatsapp-promo"
            aria-label={activePromo.label}
          >
            <img src={activePromo.image} alt="" className="floating-whatsapp-promo-image" />
          </Link>

          <div className="floating-whatsapp-promo-dots" role="group" aria-label={isArabic ? 'اختيار العرض' : 'Choose promotion'}>
            {promoSlides.map((promo, index) => (
              <button
                key={promo.image}
                type="button"
                className={`floating-whatsapp-promo-dot${index === activePromoIndex ? ' is-active' : ''}`}
                onClick={() => setActivePromoIndex(index)}
                aria-label={`${isArabic ? 'العرض' : 'Promotion'} ${index + 1}`}
                aria-current={index === activePromoIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        id="customer-support-menu"
        className="floating-support-menu"
        role="dialog"
        aria-modal="false"
        aria-hidden={!isOpen}
        aria-label={isArabic ? 'خيارات التواصل مع خدمة العملاء' : 'Customer support contact options'}
      >
        <span className="floating-support-menu__glow" aria-hidden="true" />
        <div className="floating-support-menu__header">
          <span className="floating-support-menu__header-icon" aria-hidden="true">
            <Headphones className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span>
            <strong>{isArabic ? 'خدمة العملاء' : 'Customer support'}</strong>
            <small>{isArabic ? 'اختر طريقة التواصل المناسبة' : 'Choose how you would like to connect'}</small>
          </span>
        </div>

        <div className="floating-support-menu__actions">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="floating-support-option floating-support-option--whatsapp"
            onClick={() => setIsOpen(false)}
          >
            <span className="floating-support-option__icon" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path
                  fill="currentColor"
                  d="M16.03 3.2c-7.08 0-12.81 5.71-12.81 12.77 0 2.26.6 4.48 1.73 6.42L3 29l6.79-1.78a12.84 12.84 0 0 0 6.24 1.6h.01c7.08 0 12.81-5.72 12.81-12.78A12.75 12.75 0 0 0 16.03 3.2Zm0 23.49h-.01a10.7 10.7 0 0 1-5.45-1.49l-.39-.23-4.03 1.05 1.08-3.92-.25-.4a10.57 10.57 0 0 1-1.63-5.66c0-5.9 4.8-10.7 10.7-10.7 2.86 0 5.55 1.1 7.57 3.13a10.58 10.58 0 0 1 3.13 7.56c0 5.9-4.8 10.7-10.72 10.7Zm5.87-8.01c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.71.16-.21.31-.82 1.04-1 1.25-.18.21-.37.24-.68.08-.32-.16-1.34-.49-2.56-1.55-.95-.85-1.6-1.9-1.79-2.21-.18-.31-.02-.48.14-.64.14-.14.32-.37.48-.56.16-.19.21-.31.31-.52.11-.21.05-.4-.03-.56-.08-.16-.71-1.7-.98-2.33-.25-.6-.5-.51-.7-.52h-.6c-.21 0-.56.08-.85.39-.29.31-1.11 1.09-1.11 2.66 0 1.57 1.14 3.08 1.3 3.29.16.21 2.26 3.45 5.48 4.84.76.33 1.36.52 1.82.67.76.24 1.45.2 2 .12.61-.09 1.89-.77 2.16-1.51.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z"
                />
              </svg>
            </span>
            <span className="floating-support-option__copy">
              <strong>{isArabic ? 'محادثة واتساب' : 'WhatsApp chat'}</strong>
              <small>{isArabic ? 'راسل فريق الدعم مباشرة' : 'Message our support team'}</small>
            </span>
            <MessageCircleMore className="floating-support-option__arrow" aria-hidden="true" />
          </a>

          <a
            href={callHref}
            className="floating-support-option floating-support-option--call"
            onClick={() => setIsOpen(false)}
          >
            <span className="floating-support-option__icon" aria-hidden="true">
              <Phone className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="floating-support-option__copy">
              <strong>{isArabic ? 'اتصال مباشر' : 'Call support'}</strong>
              <small dir="ltr">+{supportNumber}</small>
            </span>
            <Phone className="floating-support-option__arrow" aria-hidden="true" />
          </a>
        </div>
      </div>

      <button
        type="button"
        aria-label={isOpen
          ? (isArabic ? 'إغلاق خيارات خدمة العملاء' : 'Close customer support options')
          : (isArabic ? 'فتح خيارات خدمة العملاء' : 'Open customer support options')}
        aria-expanded={isOpen}
        aria-controls="customer-support-menu"
        className="floating-whatsapp-action"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="floating-whatsapp-ring" aria-hidden="true" />
        <span className="floating-whatsapp-tooltip" aria-hidden="true">{tooltipText}</span>
        <span className="floating-whatsapp-button">
          <Headphones className="floating-whatsapp-icon floating-whatsapp-icon--headset" aria-hidden="true" strokeWidth={2.15} />
          <X className="floating-whatsapp-icon floating-whatsapp-icon--close" aria-hidden="true" strokeWidth={2.3} />
        </span>
      </button>
    </div>
  );
};

export default FloatingWhatsApp;
