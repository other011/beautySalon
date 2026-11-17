import { Droplets, Feather, Flower2, Sparkles, Sun, Waves } from 'lucide-react';

const ICONS = { sun: Sun, feather: Feather, sparkles: Sparkles, waves: Waves, droplets: Droplets, flower: Flower2 } as const;

export const ICON_KEYS = Object.keys(ICONS);

export function ServiceIcon({ name, className = 'h-6 w-6' }: { name?: string | null; className?: string }) {
  const Icon = ICONS[(name ?? 'flower') as keyof typeof ICONS] ?? Flower2;
  return <Icon className={className} aria-hidden />;
}

const GRADIENTS = [
  'from-gold-100 via-nude-100 to-sand-100',
  'from-nude-100 via-sand-100 to-gold-100',
  'from-sand-100 via-gold-100 to-nude-200',
  'from-nude-200 via-gold-100 to-sand-50',
];

/** Decorative tile used when a service has no photo. */
export function ServiceVisual({ icon, imageUrl, index = 0, className = '' }: { icon?: string | null; imageUrl?: string | null; index?: number; className?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} ${className}`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 text-gold-600 shadow-card backdrop-blur">
        <ServiceIcon name={icon} className="h-8 w-8" />
      </span>
    </div>
  );
}
