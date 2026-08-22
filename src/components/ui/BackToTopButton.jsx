import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 420);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.92 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-5 left-5 z-[75] inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[linear-gradient(135deg,rgb(var(--color-primary-rgb)/0.94),rgb(255_215_0/0.98))] text-[var(--color-button-text)] shadow-[0_22px_42px_-24px_rgb(var(--color-primary-rgb)/0.56)] transition-transform duration-200 hover:-translate-y-1"
          aria-label="العودة للأعلى"
        >
          <ArrowUp className="h-4.5 w-4.5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};

export default BackToTopButton;
