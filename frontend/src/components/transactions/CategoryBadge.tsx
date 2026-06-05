import { getCategoryColor } from '../../lib/utils';

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const color = getCategoryColor(category);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {category}
    </span>
  );
}
