export type SlideAspectRatio = '16:9' | '4:3';

export function getFilmstripThumbnailClass(isActive: boolean, aspectRatio: SlideAspectRatio) {
  const sizeClass = aspectRatio === '4:3' ? 'w-48 h-[144px]' : 'w-64 h-[144px]';
  const stateClass = isActive
    ? 'border-primary ring-8 ring-primary/10 scale-105 shadow-2xl z-20'
    : 'border-border opacity-70 hover:opacity-100 hover:border-primary/40 hover:scale-[1.02]';

  return `flex-shrink-0 ${sizeClass} rounded-2xl border-2 transition-all relative overflow-hidden group ${stateClass}`;
}
