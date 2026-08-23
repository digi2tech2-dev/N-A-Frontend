import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const HeroSlider = ({ slides }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const dragStartX = useRef(null);
  const { i18n } = useTranslation();
  const hasMultipleSlides = (slides?.length || 0) > 1;
  const isArabic = (i18n.resolvedLanguage || i18n.language || 'ar').toLowerCase().startsWith('ar');
  const verseText = isArabic
    ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ ﴿وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا﴾ صَدَقَ اللَّهُ الْعَظِيمُ'
    : 'In the name of Allah, the Most Gracious, the Most Merciful. Allah has permitted trade and forbidden interest. Allah Almighty has spoken the truth.';

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
        <div
          className="marquee-wrap"
          dir={isArabic ? 'rtl' : 'ltr'}
          role="note"
          aria-label={verseText}
        >
          <div className="marquee-track-smooth" aria-hidden="true">
            <span className="marquee-chunk text-[11px] font-semibold tracking-[0.02em] text-[var(--color-text)] sm:text-[12px]" dir={isArabic ? 'rtl' : 'ltr'}>
              {verseText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSlider;
