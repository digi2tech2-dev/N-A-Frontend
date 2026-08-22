import React, { useEffect, useMemo } from 'react';
import {
  CirclePlus,
  House,
  Search,
  ShoppingCart,
  WalletCards,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import useHideOnScroll from '../../hooks/useHideOnScroll';
import useAuthStore from '../../store/useAuthStore';
import { isAdminRole, isSupervisorRole } from '../../utils/authRoles';
import { preloadRoute } from '../../transitions/routeModules';

const HIDDEN_PATHS = [
  '/auth',
  '/login',
  '/email-verified',
  '/verify-account',
  '/account-pending',
  '/account-rejected',
];

const isPathActive = (pathname, matches) => matches.some((path) => (
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
));

const MobileBottomNav = () => {
  const location = useLocation();
  const { language, dir } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const isArabic = language === 'ar' || dir === 'rtl';
  const isStaff = isAdminRole(user?.role) || isSupervisorRole(user?.role);
  const isCustomer = Boolean(user) && !isStaff;
  const isHiddenPage = location.pathname.startsWith('/admin')
    || HIDDEN_PATHS.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const shouldShow = isCustomer && !isHiddenPage;
  const { isHidden: isBarHidden, isScrolled: isBarScrolled } = useHideOnScroll({
    enabled: shouldShow,
    hideAfter: 15,
    minimumDelta: 5,
  });

  const items = useMemo(() => ([
    {
      to: '/orders',
      label: isArabic ? 'طلباتي' : 'Orders',
      icon: ShoppingCart,
      matches: ['/orders', '/target-orders'],
      accent: '139 92 246',
    },
    {
      to: '/wallet/add-balance',
      label: isArabic ? 'إضافة رصيد' : 'Add balance',
      icon: CirclePlus,
      matches: ['/wallet/add-balance', '/wallet/payment-details'],
      accent: '16 185 129',
    },
    {
      to: '/dashboard',
      label: isArabic ? 'الرئيسية' : 'Home',
      icon: House,
      matches: ['/dashboard'],
      featured: true,
      accent: '14 165 233',
    },
    {
      to: '/wallet/topup-history',
      label: isArabic ? 'سجل الرصيد' : 'Wallet history',
      icon: WalletCards,
      matches: ['/wallet/topup-history', '/wallet/topups'],
      accent: '245 158 11',
    },
    {
      to: '/products',
      label: isArabic ? 'البحث' : 'Search',
      icon: Search,
      matches: ['/products', '/purchase'],
      accent: '236 72 153',
      colorShift: true,
      state: { openProductSearch: true },
    },
  ]), [isArabic]);

  useEffect(() => {
    document.body.dataset.mobileBottomNav = shouldShow ? 'true' : 'false';

    return () => {
      delete document.body.dataset.mobileBottomNav;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <nav
      className={`mobile-bottom-nav mobile-auto-hide-bar fixed inset-x-0 bottom-0 z-[65] px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] md:hidden ${isBarHidden ? 'is-hidden' : 'is-visible'} ${isBarScrolled ? 'is-scrolled' : 'is-at-top'}`}
      aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}
      dir={dir}
    >
      <div className="mobile-bottom-nav__panel relative mx-auto grid h-[4.15rem] max-w-md grid-cols-5 items-stretch overflow-visible rounded-[1.65rem] border border-violet-300/25 bg-[radial-gradient(ellipse_at_16%_-8%,rgb(139_92_246/0.25),transparent_38%),radial-gradient(ellipse_at_84%_112%,rgb(14_165_233/0.18),transparent_42%),linear-gradient(118deg,rgb(7_12_28),rgb(17_24_58)_52%,rgb(30_20_66))] px-1.5 pb-1 pt-0.5 shadow-[0_-18px_54px_-34px_rgb(109_40_217/0.9),0_16px_38px_-28px_rgb(2_6_23/0.92),inset_0_1px_rgb(255_255_255/0.18),inset_0_-12px_30px_rgb(2_6_23/0.28)]">
        <span className="mobile-bottom-nav__surface pointer-events-none absolute inset-0 overflow-hidden rounded-[1.65rem]" aria-hidden="true">
          <span className="absolute inset-1 rounded-[1.35rem] border border-white/10" />
          <span className="absolute inset-x-9 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.72),transparent)]" />
          <span className="absolute -left-10 -top-12 h-24 w-40 rotate-[-18deg] rounded-full bg-white/10 blur-2xl" />
          <span className="absolute -bottom-12 right-4 h-20 w-36 rotate-[-18deg] rounded-full bg-black/15 blur-2xl" />
        </span>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isPathActive(location.pathname, item.matches);

          return (
            <Link
              key={item.to}
              to={item.to}
              state={item.state}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              style={{ '--mobile-nav-accent': item.accent }}
              onPointerEnter={() => { void preloadRoute(item.to); }}
              onTouchStart={() => { void preloadRoute(item.to); }}
              onFocus={() => { void preloadRoute(item.to); }}
              className={`mobile-bottom-nav__item group relative z-10 flex h-full min-w-0 flex-col items-center justify-end rounded-2xl px-0.5 text-center ${isActive ? 'is-active text-white' : 'text-white/70'}`}
            >
              <span
                className={`mobile-bottom-nav__item-icon relative grid place-items-center border ${isActive
                  ? 'h-[3.15rem] w-[3.15rem] rounded-full border-white/30 bg-[linear-gradient(135deg,#d946ef_0%,#7c3aed_44%,#0ea5e9_74%,#22d3ee_100%)] text-white'
                  : 'h-8 w-10 rounded-[0.85rem] border border-white/[0.06] bg-black/10 shadow-[inset_0_1px_rgb(255_255_255/0.06)]'} ${item.colorShift && !isActive ? 'mobile-bottom-nav__search-color' : ''}`}
              >
                <Icon className={`${isActive ? 'h-[1.35rem] w-[1.35rem] drop-shadow-[0_2px_4px_rgb(0_0_0/0.2)]' : 'h-[1.15rem] w-[1.15rem]'} transition-[width,height] duration-100`} strokeWidth={isActive ? 2.45 : 2.1} />
                {isActive ? (
                  <span className="absolute -bottom-1 h-0.5 w-3 rounded-full bg-white/90 shadow-[0_0_8px_rgb(217_70_239/0.95),0_0_12px_rgb(34_211_238/0.85)]" />
                ) : null}
              </span>
              <span className="mobile-bottom-nav__item-label max-w-full truncate text-[0.62rem] font-black leading-none tracking-tight" aria-hidden={!isActive}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
