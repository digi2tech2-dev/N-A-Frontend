import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AmbientBackground from './AmbientBackground';
import { useLanguage } from '../../context/LanguageContext';
import useAuthStore from '../../store/useAuthStore';
import { isAdminRole } from '../../utils/authRoles';
import SiteCopyrightFooter from './SiteCopyrightFooter';
import {
  getDashboardPathForRole,
  registerVisitedPath,
} from '../../utils/navigation';

const Layout = ({ children = null }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { dir, language } = useLanguage();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleViewportChange = (event = mediaQuery) => {
      const mobile = event.matches;
      setIsMobile((current) => (current === mobile ? current : mobile));
      setIsSidebarOpen((current) => (current === !mobile ? current : !mobile));
    };

    handleViewportChange(mediaQuery);
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    registerVisitedPath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    document.body.dataset.sidebarOpen = String(isSidebarOpen);
    return () => {
      delete document.body.dataset.sidebarOpen;
    };
  }, [isSidebarOpen]);

  const isHomePage = [
    '/dashboard',
    '/admin/dashboard',
  ].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAdmin = isAdminRole(user?.role);
  const isCustomerDashboard = location.pathname === '/dashboard';
  const isBuyTargetPage = location.pathname === '/buy-target';
  const isWalletTopupPage = (
    location.pathname === '/wallet/add-balance'
    || location.pathname.startsWith('/wallet/payment-details/')
  );
  const shellOffset = !isMobile ? (isSidebarOpen ? '318px' : '112px') : '0';
  const showCopyrightFooter = !isAdmin || isHomePage;
  const fixedShell = (
    <>
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isMobile={isMobile}
      />

      <div
        className="fixed z-40 max-w-full transition-all duration-300"
        style={{
          top: isMobile ? 'max(0.75rem, env(safe-area-inset-top))' : '1rem',
          [dir === 'rtl' ? 'right' : 'left']: isMobile ? '12px' : shellOffset,
          [dir === 'rtl' ? 'left' : 'right']: isMobile ? '12px' : '16px',
        }}
      >
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      </div>
    </>
  );

  const handleGoBack = () => {
    if (isBuyTargetPage) {
      window.dispatchEvent(new Event('ka:buy-target-back'));
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(getDashboardPathForRole(user?.role));
  };

  useEffect(() => {
    const handleNativeBack = (event) => {
      handleGoBack();
      event.preventDefault();
      if (event.detail) event.detail.handled = true;
    };

    window.addEventListener('nahub:native:back', handleNativeBack);
    return () => window.removeEventListener('nahub:native:back', handleNativeBack);
  }, [handleGoBack]);

  return (
    <div className={`relative min-h-screen overflow-x-clip bg-transparent text-[var(--color-text)] ${isAdminPage ? 'layout-admin-light' : ''}`}>
      <AmbientBackground />
      {typeof document !== 'undefined' ? createPortal(fixedShell, document.body) : fixedShell}

      <div
        className="min-h-screen min-w-0 max-w-full transition-all duration-300"
        style={{ [dir === 'rtl' ? 'marginRight' : 'marginLeft']: shellOffset }}
      >
        <div className="h-[4.9rem] sm:h-[6.5rem]" aria-hidden="true" />

        {!isHomePage && (
          <div className="mx-auto mt-4 max-w-[var(--shell-max-width)] px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="premium-back-button group inline-flex h-9 items-center gap-2 px-1.5 pe-3 text-xs font-extrabold"
                aria-label={dir === 'rtl' ? 'رجوع' : 'Back'}
              >
                <span className="premium-back-button__icon grid h-6 w-6 place-items-center">
                  {dir === 'rtl' ? <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} /> : <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />}
                </span>
                <span>{dir === 'rtl' ? 'رجوع' : 'Back'}</span>
              </button>

              {isWalletTopupPage ? (
                <button
                  type="button"
                  onClick={() => navigate(isBuyTargetPage ? '/target-orders' : '/wallet/topup-history')}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.26)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 text-sm font-semibold text-[var(--color-primary)] shadow-[var(--shadow-subtle)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.42)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.14)]"
                  aria-label={dir === 'rtl' ? 'سجل الطلبات' : 'Order history'}
                  title={dir === 'rtl' ? 'سجل الطلبات' : 'Order history'}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">{dir === 'rtl' ? 'سجل الطلبات' : 'Order history'}</span>
                </button>
              ) : null}
            </div>
          </div>
        )}

        <main className={`min-w-0 overflow-x-hidden px-3 py-5 sm:px-4 md:px-6 md:py-6 lg:px-8 lg:py-8 ${isHomePage ? 'scrollbar-hide' : ''} ${isCustomerDashboard ? '!pt-0 sm:!pt-0 md:!pt-0 lg:!pt-0' : ''}`}>
          <div className="mx-auto w-full min-w-0 max-w-[var(--shell-max-width)]">
            {children || <Outlet />}
          </div>
        </main>
        {showCopyrightFooter ? (
          <SiteCopyrightFooter
            isArabic={language === 'ar' || dir === 'rtl'}
            showEngineerContact={!isAdmin}
          />
        ) : null}
      </div>
    </div>
  );
};

export default Layout;
