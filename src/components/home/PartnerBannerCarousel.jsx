import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Normaliza um parceiro para o formato de slide
function partnerToSlide(p) {
  return {
    id: p.id,
    title: p.name,
    subtitle: p.discount_description || '',
    image_url: p.image_url || '',
    badge_text: p.discount_value,
    link_url: `/PartnerDetail?id=${p.id}`,
    image_height: 192,
    image_fit: 'cover',
    open_external: false,
    _isPartner: true,
    discount_type: p.discount_type,
  };
}

export default function PartnerBannerCarousel({ partners = [], customBanners = [] }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Combina: banners customizados ativos primeiro, depois parceiros como fallback
  const slides = customBanners.length > 0
    ? customBanners.filter(b => b.active !== false).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : partners.map(partnerToSlide);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  const goToNext = () => {
    setIsPaused(true);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToPrev = () => {
    setIsPaused(true);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const handleClick = (slide) => {
    if (!slide.link_url) return;
    if (slide.open_external) {
      window.open(slide.link_url, '_blank');
    } else {
      navigate(slide.link_url);
    }
  };

  if (slides.length === 0) return null;

  const safeIndex = currentIndex >= slides.length ? 0 : currentIndex;
  const current = slides[safeIndex];
  if (!current) return null;

  const height = current.image_height || 192;

  return (
    <div className="relative">
      <div className="relative rounded-3xl overflow-hidden" style={{ height }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            onClick={() => handleClick(current)}
          >
            <Card className="h-full relative overflow-hidden cursor-pointer group">
              <div className="absolute inset-0">
                {current.image_url ? (
                  <img
                    src={current.image_url}
                    alt={current.title}
                    className={`w-full h-full transition-transform duration-500 group-hover:scale-105`}
                    style={{ objectFit: current.image_fit || 'cover' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              </div>

              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex justify-end">
                  {current.badge_text && (
                    <Badge className="bg-accent text-accent-foreground font-bold text-sm px-3 py-1.5 shadow-lg">
                      {current._isPartner && current.discount_type === 'percentual' ? (
                        <Percent className="w-3 h-3 mr-1" />
                      ) : current._isPartner ? (
                        <Gift className="w-3 h-3 mr-1" />
                      ) : null}
                      {current.badge_text}
                    </Badge>
                  )}
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-xl mb-1 drop-shadow-lg">{current.title}</h3>
                  {current.subtitle && (
                    <p className="text-sm text-white/90 drop-shadow line-clamp-2">{current.subtitle}</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setIsPaused(true); setCurrentIndex(idx); setTimeout(() => setIsPaused(false), 5000); }}
              className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}