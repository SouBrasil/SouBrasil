import { useState } from 'react';
import { ArrowLeft, Heart, Star, ChevronLeft, ChevronRight, Percent, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PartnerImageCarousel({ partner, onBack, onFavorite, isFavorited }) {
  const images = partner.images?.length > 0
    ? partner.images
    : partner.image_url
      ? [partner.image_url]
      : [];

  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  return (
    <div className="relative w-full bg-muted overflow-hidden" style={{ aspectRatio: '3/4' }}>
      {images.length > 0 ? (
        <>
          <img
            src={images[current]}
            alt={partner.name}
            className="w-full h-full object-cover transition-opacity duration-300"
            key={current}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all ${i === current ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                  />
                ))}
              </div>
              {/* Counter */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
                {current + 1}/{images.length}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Star className="w-16 h-16 text-primary/30" />
        </div>
      )}

      <button
        onClick={onBack}
        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        onClick={onFavorite}
        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md"
      >
        <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>
      <div className="absolute bottom-4 right-4">
        <Badge className="bg-accent text-accent-foreground text-lg font-bold px-4 py-2 shadow-lg">
          {partner.discount_type === 'percentual' ? <Percent className="w-4 h-4 mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
          {partner.discount_value}
        </Badge>
      </div>
    </div>
  );
}