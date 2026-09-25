import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X, ExternalLink, MapPin, Star, Utensils, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '@/constants/app';

export interface BusinessCardData {
  id: string;
  category: string;
  title: string;
  businessName: string;
  location: string;
  rating: string;
  monthlyOrders: string;
  imageUrl: string;
  slug: string;
  description: string;
  highlights: string[];
  popularDishes: string[];
}

const businessCards: BusinessCardData[] = [
  {
    id: '1',
    category: 'SPECIALTY COFFEE & PIZZA',
    title: 'Orders Reach the Kitchen Instantly',
    businessName: 'The Artisan Roastery & Café',
    location: 'Bandra West, Mumbai',
    rating: '4.9 ★',
    monthlyOrders: '2,850+ orders/mo',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&q=80',
    slug: 'artisan-cafe',
    description: `A coffee shop known for fresh pour-over coffee and sourdough pizzas, running with ${APP_NAME}'s live kitchen screen.`,
    highlights: ['Orders Sent to Kitchen Instantly', 'QR Code Table Ordering', 'Clear Sales & Fee Tracking'],
    popularDishes: ['Paneer Tikka Passion Pizza', 'Signature Cold Coffee', 'Peri Peri Fries']
  },
  {
    id: '2',
    category: 'FRENCH BAKERY & MATCHA',
    title: 'Contactless Table QR Ordering',
    businessName: 'Bean & Butter Artisan Bakery',
    location: 'Indiranagar, Bengaluru',
    rating: '4.8 ★',
    monthlyOrders: '2,140+ orders/mo',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=80',
    slug: 'bean-and-butter',
    description: 'Charming French bakery offering double-baked almond croissants and ceremonial grade matcha lattes with zero-wait table ordering.',
    highlights: ['Zero App Download Required', 'Stock Updates on Its Own', 'Live Order Status Tracker'],
    popularDishes: ['Classic Almond Butter Croissant', 'Iced Uji Matcha Latte', 'Pain Au Chocolat']
  },
  {
    id: '3',
    category: 'ORGANIC BISTRO & BREW BAR',
    title: 'Recipes That Track Stock for You',
    businessName: 'Verde Organic Bistro',
    location: 'Connaught Place, New Delhi',
    rating: '4.9 ★',
    monthlyOrders: '3,420+ orders/mo',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&q=80',
    slug: 'verde-bistro',
    description: `Sustainable plant-based bistro using ${APP_NAME} recipes to cut food waste — ingredients come off the stock count on their own.`,
    highlights: ['Recipe-Based Stock Tracking', 'Low-Stock Alerts', 'Clear Money Records'],
    popularDishes: ['Avocado Sourdough Toast', 'Cold Pressed Green Juice', 'Truffle Mushroom Pasta']
  },
  {
    id: '4',
    category: 'HERITAGE TEA & DIM SUM',
    title: 'Easy Management for Many Tables',
    businessName: 'Copper Kettle Tea House',
    location: 'Park Street, Kolkata',
    rating: '4.7 ★',
    monthlyOrders: '1,980+ orders/mo',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80',
    slug: 'copper-kettle',
    description: 'Historic tea house specializing in first-flush Darjeeling teas and artisanal dim sum with bills made instantly at the front desk.',
    highlights: ['QR Code Generator for 50+ Tables', 'Front-Desk Billing', 'Custom Tax Breakdown'],
    popularDishes: ['Darjeeling First Flush Tea', 'Steamed Crystal Dumplings', 'Matcha Sponge Cake']
  },
  {
    id: '5',
    category: 'ROOFTOP LOUNGE & TAPAS',
    title: 'Different Access for Each Staff Member',
    businessName: 'Aura Rooftop Lounge & Brews',
    location: 'Jubilee Hills, Hyderabad',
    rating: '4.9 ★',
    monthlyOrders: '4,500+ orders/mo',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1000&q=80',
    slug: 'aura-lounge',
    description: `High-volume nightlife lounge using ${APP_NAME} to give bartenders, waiters and managers their own access.`,
    highlights: ['Staff Roles & Permissions', 'Live Sales Reports', 'Bills Sent by SMS/WhatsApp'],
    popularDishes: ['Craft Smoked Cocktails', 'Woodfired Tapas Platter', 'Truffle Fries']
  }
];

export const AppleCardsCarousel: React.FC = () => {
  const [activeCard, setActiveCard] = useState<BusinessCardData | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

      // Compute active slide index based on scroll position
      const cardWidth = 370; // approximate card width + gap
      const index = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(Math.max(index, 0), businessCards.length - 1));
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // AUTO-MOVING CAROUSEL: Auto advance every 3.5 seconds unless hovered or modal open
  useEffect(() => {
    if (isHovered || activeCard) return;

    const timer = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        const isEnd = scrollLeft + clientWidth >= scrollWidth - 20;

        if (isEnd) {
          // Loop back to start smoothly
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll to next card
          carouselRef.current.scrollBy({ left: 360, behavior: 'smooth' });
        }
        setTimeout(checkScroll, 400);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [isHovered, activeCard]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: index * 360, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCard(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full py-16 bg-slate-50 relative overflow-hidden font-sans border-y border-slate-200/80">
      
      {/* Section Title Header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>Businesses Using Us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Powered by {APP_NAME}.
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl font-medium">
            Discover real businesses, artisan bakeries, and rooftop lounges operating with zero kitchen delay on {APP_NAME}.
          </p>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Moving Indicator Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm mr-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>Auto-Scrolling</span>
          </div>

          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll Left"
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 hover:border-red-600 hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll Right"
            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 hover:border-red-600 hover:text-white transition-all duration-300"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Moving Carousel Track (Aligned with Powered by header) */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div
          ref={carouselRef}
          onScroll={checkScroll}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex gap-6 overflow-x-auto scrollbar-none pb-8 pt-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
        {businessCards.map((card, idx) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            onClick={() => setActiveCard(card)}
            whileHover={{ y: -8, scale: 1.015 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-shrink-0 w-[310px] sm:w-[360px] h-[460px] rounded-3xl relative overflow-hidden cursor-pointer shadow-xl shadow-slate-200/80 border border-slate-300/80 bg-slate-950 group snap-start transition-all"
          >
            {/* Crisp High-Res Image with Smooth Scale */}
            <img
              src={card.imageUrl}
              alt={card.businessName}
              className="w-full h-full object-cover object-center filter-none group-hover:scale-110 transition-transform duration-1000 ease-out"
            />

            {/* Carefully Tuned Gradient Scrim (Vivid Image on Top, Dark Gradient on Bottom Text) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

            {/* Top Pill Badges */}
            <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-10 gap-2">
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-white bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-lg truncate max-w-[200px]">
                {card.category}
              </span>
              <span className="text-[10px] font-extrabold text-white bg-red-600/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/40 flex items-center gap-1 shadow-lg flex-shrink-0">
                <Zap className="w-3 h-3 fill-white" /> {card.monthlyOrders}
              </span>
            </div>

            {/* Bottom Content Area */}
            <div className="absolute bottom-6 left-6 right-6 z-10 space-y-2.5 text-left">
              {/* Location & Rating Pill */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1 text-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> {card.location}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-extrabold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {card.rating}
                </span>
              </div>

              {/* Business Name */}
              <h3 className="text-2xl font-black text-white leading-snug drop-shadow-md">
                {card.businessName}
              </h3>

              {/* Subtitle Feature */}
              <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
                {card.title}
              </p>

              {/* Interactive CTA Link */}
              <div className="pt-2 flex items-center gap-1.5 text-xs font-extrabold text-red-400 group-hover:text-red-300 transition-colors">
                <span>See Their Story & Menu</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-red-500" />
              </div>
            </div>
          </motion.div>
        ))}
        </div>
      </div>

      {/* Slide Progress Indicator Dots */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {businessCards.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all duration-500 ${
              activeIndex === idx 
                ? 'w-8 bg-red-600 shadow-md shadow-red-600/50' 
                : 'w-2.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      {/* Expandable Card Modal (AnimatePresence) */}
      <AnimatePresence>
        {activeCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCard(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              layoutId={`card-${activeCard.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col font-sans text-slate-900 border border-slate-200"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveCard(null)}
                className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Hero Header */}
              <div className="relative h-64 sm:h-72 w-full flex-shrink-0 bg-slate-950">
                <img
                  src={activeCard.imageUrl}
                  alt={activeCard.businessName}
                  className="w-full h-full object-cover object-center filter-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 text-left space-y-2">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-red-400 bg-red-950/80 border border-red-800/60 px-3 py-1 rounded-full inline-block">
                    {activeCard.category}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {activeCard.businessName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-500" /> {activeCard.location}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-extrabold">{activeCard.rating}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-extrabold">{activeCard.monthlyOrders}</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-left">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">About This Business</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {activeCard.description}
                  </p>
                </div>

                {/* Highlights */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">{APP_NAME} Features Utilized</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeCard.highlights.map((feat, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-red-50/80 border border-red-200/80 text-red-900 text-xs font-extrabold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Dishes */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Popular Menu Selections</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeCard.popularDishes.map((dish, idx) => (
                      <span key={idx} className="px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-slate-500" /> {dish}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 font-medium">
                    Experience customer QR ordering for this business:
                  </div>

                  <Link
                    to={`/c/${activeCard.slug}/t/tok_artisan_tbl_01`}
                    onClick={() => setActiveCard(null)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Try Their QR Menu</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
