import React from 'react';
import { ArrowLeft, Download, Gamepad2, ShieldCheck, Sparkles, WalletCards, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import brandLogo from '../assets/logo.PNG';
import { ANDROID_APK_DOWNLOAD_URL } from '../config/appDownloads';
import styles from './WebLanding.module.css';

const highlights = [
  { icon: Zap, title: 'خدمات رقمية سريعة', text: 'اختَر ما تحتاجه وأنجزه بسلاسة.' },
  { icon: WalletCards, title: 'محفظة واضحة', text: 'تابع رصيدك وعملياتك في مكان واحد.' },
  { icon: ShieldCheck, title: 'تجربة موثوقة', text: 'تصميم آمن ومريح لكل خطوة.' },
];

const WebLanding = () => (
  <main className={styles.page} dir="rtl">
    <div className={styles.ambient} aria-hidden="true" />
    <header className={styles.header}>
      <Link to="/" className={styles.brand} aria-label="N&A HUB الرئيسية">
        <img src={brandLogo} alt="" />
        <span>N&amp;A HUB</span>
      </Link>
      <nav className={styles.nav} aria-label="روابط الحساب">
        <Link to="/login?mode=login" className={styles.loginLink}>تسجيل الدخول</Link>
        <Link to="/auth?mode=signup" className={styles.registerLink}>إنشاء حساب</Link>
      </nav>
    </header>

    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><Sparkles aria-hidden="true" /> عالمك الرقمي، ببساطة أكبر</p>
        <h1 id="landing-title">كل ما تحتاجه من الخدمات الرقمية، <span>في HUB واحد.</span></h1>
        <p className={styles.lede}>اكتشف المنتجات والخدمات، أدِر رصيدك، وتابع طلباتك من تجربة عربية مصممة لتكون واضحة وسريعة.</p>
        <div className={styles.actions}>
          <Link to="/auth?mode=signup" className={styles.primaryAction}>
            ابدأ الآن <ArrowLeft aria-hidden="true" />
          </Link>
          <Link to="/login?mode=login" className={styles.secondaryAction}>لدي حساب بالفعل</Link>
        </div>
        <a className={styles.downloadCard} href={ANDROID_APK_DOWNLOAD_URL} target="_blank" rel="noreferrer">
          <span className={styles.downloadIcon}><Download aria-hidden="true" /></span>
          <span><strong>تحميل تطبيق N&amp;A HUB</strong><small>متوفر لأجهزة Android</small></span>
          <ArrowLeft className={styles.downloadArrow} aria-hidden="true" />
        </a>
      </div>

      <div className={styles.visual} aria-label="لمحة عن تجربة N&A HUB">
        <div className={styles.visualGlow} aria-hidden="true" />
        <div className={styles.phone}>
          <div className={styles.phoneTop}><span /><img src={brandLogo} alt="" /><span className={styles.appName}>N&amp;A HUB</span></div>
          <div className={styles.phoneHero}><Sparkles /><span>مرحبًا بك</span><strong>تجربة رقمية أقرب لك</strong></div>
          <div className={styles.balance}><span>رصيدك المتاح</span><strong>24,680 <small>ج.م</small></strong><i /></div>
          <div className={styles.tiles}><span><Gamepad2 /><small>الألعاب</small></span><span><WalletCards /><small>المحفظة</small></span><span><Zap /><small>الأسرع</small></span></div>
        </div>
        <div className={`${styles.floatingTag} ${styles.tagOne}`}><ShieldCheck /> موثوق</div>
        <div className={`${styles.floatingTag} ${styles.tagTwo}`}><Zap /> فوري</div>
      </div>
    </section>

    <section className={styles.highlights} aria-label="مزايا N&A HUB">
      {highlights.map(({ icon: Icon, title, text }) => (
        <article key={title} className={styles.highlight}>
          <span><Icon aria-hidden="true" /></span><div><h2>{title}</h2><p>{text}</p></div>
        </article>
      ))}
    </section>
  </main>
);

export default WebLanding;
