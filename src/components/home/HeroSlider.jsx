import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MarqueeText = ({ children }) => {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      track.style.transform = 'none';
      return undefined;
    }

    let animationFrame = 0;
    let lastTime = 0;
    let position = 0;
    let chunkWidth = 0;
    let wrapWidth = 0;
    const firstChunk = track.firstElementChild;

    const measure = (reset = false) => {
      wrapWidth = wrap.clientWidth;
      chunkWidth = firstChunk?.getBoundingClientRect().width || track.scrollWidth;
      // Preserve the current position when a resize/font load triggers a
      // measurement while the ticker is already moving.
      if (reset || !Number.isFinite(position)) position = -chunkWidth;
      track.style.transform = `translateX(${position}px)`;
    };

    const tick = (time) => {
      if (!lastTime) lastTime = time;
      const elapsed = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Complete one full left-to-right pass in 34 seconds on phones and
      // 24 seconds elsewhere, then immediately restart from the left.
      const duration = window.innerWidth <= 640 ? 34 : 24;
      const distance = Math.max(wrapWidth + chunkWidth, 1);
      position += (distance / duration) * elapsed;

      // The text is fully beyond the right edge here. Resetting to its exact
      // off-screen left position makes it enter again immediately.
      const wrapRect = wrap.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      if (trackRect.left >= wrapRect.right - 0.5) {
        position = -chunkWidth;
      }
      track.style.transform = `translateX(${position}px)`;
      animationFrame = window.requestAnimationFrame(tick);
    };

    measure(true);
    animationFrame = window.requestAnimationFrame(tick);

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => measure())
      : null;
    resizeObserver?.observe(wrap);
    if (firstChunk) resizeObserver?.observe(firstChunk);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="marquee-wrap">
      <div ref={trackRef} className="marquee-track-smooth" aria-hidden="true">
        <span className="marquee-chunk">{children}</span>
      </div>
    </div>
  );
};

const HeroSlider = ({ slides }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const dragStartX = useRef(null);
  const { i18n } = useTranslation();
  const hasMultipleSlides = (slides?.length || 0) > 1;
  const isArabic = (i18n.resolvedLanguage || i18n.language || 'ar').toLowerCase().startsWith('ar');
  const promoText = isArabic
    ? 'حمّل تطبيق N&A الآن — أسرع وأسهل طريقة لاكتشاف خدماتك الرقمية، إتمام طلباتك، ومتابعة كل شيء من مكان واحد.'
    : 'Download the N&A app now — the faster, easier way to discover digital services, place orders, and track everything in one place.';

  useEffect(() => {
    if (!hasMultipleSlides) return undefined;

    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [hasMultipleSlides, slides]);

  const changeSlide = useCallback((direction) => {
    if (!slides?.length) return;
    setCurrentSlide((current) => (current + direction + slides.length) % slides.length);
  }, [slides]);

  const handlePointerDown = (event) => {
    if (!hasMultipleSlides || event.button !== 0) return;
    dragStartX.current = event.clientX;
  };

  const handlePointerUp = (event) => {
    if (dragStartX.current === null) return;
    const distance = event.clientX - dragStartX.current;
    dragStartX.current = null;

    if (Math.abs(distance) < 45) return;
    changeSlide(distance < 0 ? 1 : -1);
  };

  if (!slides?.length) return null;

  const slide = slides[currentSlide];
  const SlideFrame = slide.href ? 'a' : 'div';
  const slideFrameProps = slide.href
    ? {
      href: slide.href,
      target: slide.href.startsWith('http') ? '_blank' : undefined,
      rel: slide.href.startsWith('http') ? 'noreferrer' : undefined,
      'aria-label': slide.alt || slide.title || (isArabic ? 'فتح الرابط' : 'Open link'),
    }
    : {};

  return (
    <div className="mx-auto w-full max-w-5xl space-y-1.5 sm:space-y-2">
      <section
        className="relative aspect-[2048/752] touch-pan-y select-none overflow-hidden rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.58)] bg-[var(--color-card)] shadow-[0_22px_70px_-34px_rgb(0_0_0/0.9),0_0_40px_-26px_rgb(var(--color-primary-rgb)/0.7)] sm:rounded-[1.65rem]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStartX.current = null; }}
      >
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.13),transparent_34%)]" />
        <div key={slide.id || currentSlide} className="absolute inset-0 animate-[fade-in_0.7s_ease-out] motion-reduce:animate-none">
          <SlideFrame {...slideFrameProps} className="block h-full w-full">
            <img
              src={slide.image}
              alt={slide.alt || ''}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable="false"
              sizes="100vw"
              className="block h-full w-full object-cover"
            />
          </SlideFrame>
        </div>

      </section>

      <div className="px-1 sm:px-1.5">
        <div dir={isArabic ? 'rtl' : 'ltr'} role="note" aria-label={promoText}>
          <MarqueeText>
            <span className="text-[11px] font-semibold tracking-[0.02em] text-[var(--color-text)] sm:text-[12px]" dir={isArabic ? 'rtl' : 'ltr'}>
              {promoText}
            </span>
          </MarqueeText>
        </div>
      </div>
    </div>
  );
};

export default HeroSlider;
