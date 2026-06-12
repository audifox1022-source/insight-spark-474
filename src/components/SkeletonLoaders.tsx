import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  );
}

export function SlideSkeleton() {
  return (
    <div className="p-4 space-y-4 border rounded-xl">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function SlideListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SlideSkeleton key={i} />
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-64 border-r p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="flex-1 p-8 flex items-center justify-center">
        <Skeleton className="w-[640px] h-[360px]" />
      </div>
      <div className="w-80 border-l p-4 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function SetupFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-16 w-full max-w-md mx-auto rounded-2xl" />
    </div>
  );
}

export function OutlineSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border rounded-3xl space-y-3">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function GeneratingSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
