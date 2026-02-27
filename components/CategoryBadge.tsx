import { Category, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';

export function CategoryBadge({ category }: { category: Category }) {
  const color = CATEGORY_COLORS[category] || '#6b7280';
  const label = CATEGORY_LABELS[category] || category;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}
