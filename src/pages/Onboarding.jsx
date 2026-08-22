import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Gamepad2,
  Play,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import introVideo from '../assets/intro-app.mp4';
import brandLogo from '../assets/logo.PNG';
import styles from './Onboarding.module.css';

const steps = [
  {
    id: 'welcome',
    eyebrow: 'مرحبًا بك في N&A HUB',
    title: 'عالمك الرقمي يبدأ من هنا',
    description: 'تجربة واحدة سريعة وآمنة لكل ما تحتاجه من خدمات ومنتجات رقمية.',
  },
  {
    id: 'wallet',
    eyebrow: 'محفظة ذكية',
    title: 'رصيدك تحت سيطرتك',
    description: 'أضف رصيدك وتابع عملياتك بوضوح، مع تجربة دفع سلسة مصممة لراحتك.',
  },
  {
    id: 'discover',
    eyebrow: 'كل شيء في مكان واحد',
    title: 'اكتشف. اختر. وانطلق.',
    description: 'وصول أسرع إلى منتجاتك المفضلة مع حماية موثوقة ودعم قريب منك دائمًا.',
  },
];

const transition = {
  type: 'spring',
  stiffness: 260,
  damping: 28,
  mass: 0.8,
};

const stepVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? '16%' : '-16%',
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? '-12%' : '12%',
    scale: 0.99,
  }),
};

const WalletVisual = () => (
  <div className={`${styles.visual} ${styles.walletVisual}`} aria-hidden="true">
    <span className={`${styles.orbit} ${styles.orbitOne}`} />
    <span className={`${styles.orbit} ${styles.orbitTwo}`} />
    <motion.div
      className={styles.walletCard}
      animate={{ y: [0, -8, 0], rotate: [-2, 0, -2] }}
      transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
    >
      <div className={styles.walletCardTop}>
        <span className={styles.walletIcon}><WalletCards /></span>
        <span className={styles.walletChip} />
      </div>
      <span className={styles.walletLabel}>رصيدك المتاح</span>
      <strong>•••• 24,680</strong>
      <div className={styles.walletCardBottom}>
        <span>N&amp;A HUB</span>
        <span>•• 4821</span>
      </div>
    </motion.div>
    <motion.span
      className={`${styles.floatingBadge} ${styles.badgeFast}`}
      animate={{ y: [0, 7, 0], rotate: [2, -2, 2] }}
      transition={{ duration: 3.8, ease: 'easeInOut', repeat: Infinity }}
    >
      <Zap /> فوري
    </motion.span>
    <motion.span
      className={`${styles.floatingBadge} ${styles.badgeSafe}`}
      animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}
    >
      <ShieldCheck /> آمن
    </motion.span>
  </div>
);

const DiscoverVisual = () => (
  <div className={`${styles.visual} ${styles.discoverVisual}`} aria-hidden="true">
    <span className={styles.discoverHalo} />
    <motion.div
      className={`${styles.serviceTile} ${styles.serviceTilePrimary}`}
      animate={{ y: [0, -10, 0], rotate: [-5, -2, -5] }}
      transition={{ duration: 4.6, ease: 'easeInOut', repeat: Infinity }}
    >
      <Gamepad2 />
      <span>الألعاب</span>
    </motion.div>
    <motion.div
      className={`${styles.serviceTile} ${styles.serviceTileSecondary}`}
      animate={{ y: [0, 8, 0], rotate: [5, 2, 5] }}
      transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}
    >
      <WalletCards />
      <span>المحفظة</span>
    </motion.div>
    <motion.div
      className={styles.centerMark}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity }}
    >
      <Sparkles />
      <span>كل ما تحب</span>
    </motion.div>
    <span className={`${styles.spark} ${styles.sparkOne}`}>✦</span>
    <span className={`${styles.spark} ${styles.sparkTwo}`}>✦</span>
    <span className={`${styles.spark} ${styles.sparkThree}`}>✦</span>
  </div>
);

const WelcomeVideo = () => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [hasError, setHasError] = useState(false);

  const startPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = true;
      await video.play();
      setNeedsInteraction(false);
    } catch {
      setNeedsInteraction(true);
    }
  }, []);

  useEffect(() => {
    void startPlayback();
  }, [startPlayback]);

  return (
    <div className={styles.videoLayer}>
      <video
        ref={videoRef}
        className={`${styles.video}${isPlaying ? ` ${styles.videoPlaying}` : ''}`}
        src={introVideo}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-label="فيديو ترحيبي لتطبيق N&A HUB"
        onCanPlay={startPlayback}
        onPlaying={() => {
          setIsPlaying(true);
          setNeedsInteraction(false);
        }}
        onError={() => setHasError(true)}
      />
      <div className={styles.videoFallback} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {!isPlaying && !hasError ? <span className={styles.videoLoader} aria-hidden="true" /> : null}
      {needsInteraction && !hasError ? (
        <button type="button" className={styles.playButton} onClick={startPlayback}>
          <Play fill="currentColor" aria-hidden="true" />
          <span>تشغيل الفيديو</span>
        </button>
      ) : null}
    </div>
  );
};

const Onboarding = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [[activeStep, direction], setActiveStep] = useState([0, 1]);
  const isFinalStep = activeStep === steps.length - 1;
  const step = steps[activeStep];

  const goToLogin = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  const goToStep = useCallback((nextStep) => {
    if (nextStep < 0 || nextStep >= steps.length || nextStep === activeStep) return;
    setActiveStep([nextStep, nextStep > activeStep ? 1 : -1]);
  }, [activeStep]);

  const handleNext = useCallback(() => {
    if (isFinalStep) {
      goToLogin();
      return;
    }

    goToStep(activeStep + 1);
  }, [activeStep, goToLogin, goToStep, isFinalStep]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'Enter') handleNext();
      if (event.key === 'ArrowRight') goToStep(activeStep - 1);
      if (event.key === 'Escape') goToLogin();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, goToLogin, goToStep, handleNext]);

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.stage} aria-label="التعريف بتطبيق N&A HUB">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={step.id}
            className={`${styles.step} ${styles[`step-${step.id}`]}`}
            custom={direction}
            variants={reduceMotion ? undefined : stepVariants}
            initial={reduceMotion ? { opacity: 0 } : 'enter'}
            animate={reduceMotion ? { opacity: 1 } : 'center'}
            exit={reduceMotion ? { opacity: 0 } : 'exit'}
            transition={reduceMotion ? { duration: 0.16 } : transition}
            drag={reduceMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (info.offset.x < -58) handleNext();
              if (info.offset.x > 58) goToStep(activeStep - 1);
            }}
          >
            {step.id === 'welcome' ? <WelcomeVideo /> : null}
            {step.id === 'wallet' ? <WalletVisual /> : null}
            {step.id === 'discover' ? <DiscoverVisual /> : null}

            <div className={styles.scrim} aria-hidden="true" />

            <div className={styles.brandPill} aria-label="N&A HUB">
              <img src={brandLogo} alt="" />
              <span>N&amp;A HUB</span>
            </div>

            <div className={styles.copy}>
              <motion.span
                className={styles.eyebrow}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.14, duration: 0.42 }}
              >
                <Sparkles aria-hidden="true" />
                {step.eyebrow}
              </motion.span>
              <motion.h1
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.2, duration: 0.48 }}
              >
                {step.title}
              </motion.h1>
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.26, duration: 0.48 }}
              >
                {step.description}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>

        <nav className={styles.controls} aria-label="التنقل بين شاشات التعريف">
          <div className={styles.progress} role="tablist" aria-label="خطوات التعريف">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={`${styles.dot}${index === activeStep ? ` ${styles.dotActive}` : ''}`}
                aria-selected={index === activeStep}
                aria-label={`الخطوة ${index + 1} من ${steps.length}`}
                onClick={() => goToStep(index)}
              >
                {index === activeStep ? <motion.span layoutId="active-onboarding-dot" /> : null}
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.nextButton} onClick={handleNext}>
              <span>التالي</span>
              <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className={styles.skipButton} onClick={goToLogin}>
              تخطي
            </button>
          </div>
        </nav>
      </section>
    </main>
  );
};

export default Onboarding;
