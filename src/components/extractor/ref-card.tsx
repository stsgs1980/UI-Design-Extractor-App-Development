'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Reference } from '@/types/extractor';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export function RefCard({
  reference,
  isSelected,
  onClick,
}: {
  reference: Reference;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tags: string[] = JSON.parse(reference.tags || '[]');

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-colors',
        isSelected
          ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between">
        <p className="truncate text-sm font-semibold">{reference.name}</p>
        {reference.isFavorite && (
          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>
      {reference.sourceUrl && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {new URL(reference.sourceUrl).hostname}
        </p>
      )}
      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {new Date(reference.createdAt).toLocaleDateString()}
      </p>
    </motion.button>
  );
}
