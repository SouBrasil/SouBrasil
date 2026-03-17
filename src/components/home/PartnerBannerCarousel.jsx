import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PartnerBannerCarousel({ partners }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Autoplay
  useEffect(() => {
    if (!partners || partners.length <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % partners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [partners.length, isPaused]);

  const goToNext = () => {
    if (!partners || partners.length === 0) return;
    setIsPaused(true);
    setCurrentIndex((prev) => (prev + 1) % partners.length);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToPrev = () => {
    if (!partners || partners.length === 0) return;
    setIsPaused(true);
    setCurrentIndex((prev) => (prev - 1 + partners.length) % partners.length);
    setTimeout(() => setIsPaused(false), 5000);
  };

  if (!partners || partners.length === 0) return null;

  const currentPartner = partners[currentIndex];

  return (
    <div className="relative">
      <div className="relative h-48 rounded-3xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            onClick={() => navigate(`/PartnerDetail?id=${currentPartner.id}`)}
          >
            <Card className="h-full relative overflow-hidden cursor-pointer group">
              {/* Background image with overlay */}
              <div className="absolute inset-0">
                {currentPartner.image_url ? (
                  <img
                    src={currentPartner.image_url}
                    alt={currentPartner.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                {/* Top badge */}
                <div className="flex justify-end">
                  <Badge className="bg-accent text-accent-foreground font-bold text-sm px-3 py-1.5 shadow-lg">
                    {currentPartner.discount_type === 'percentual' ? (
                      <Percent className="w-3 h-3 mr-1" />
                    ) : (
                      <Gift className="w-3 h-3 mr-1" />
                    )}
                    {currentPartner.discount_value}
                  </Badge>
                </div>

                {/* Bottom info */}
                <div className="text-white">
                  <h3 className="font-bold text-xl mb-1 drop-shadow-lg">
                    {currentPartner.name}
                  </h3>
                  {currentPartner.discount_description && (
                    <p className="text-sm text-white/90 drop-shadow line-clamp-2">
                      {currentPartner.discount_description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        {partners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Dots indicator */}
      {partners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {partners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsPaused(true);
                setCurrentIndex(idx);
                setTimeout(() => setIsPaused(false), 5000);
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}