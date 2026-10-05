import React from 'react';
import { 
  AlertTriangle, 
  Lightbulb, 
  Droplets, 
  Trash2, 
  HelpCircle,
  Layers,
  Waves,
  Route
} from 'lucide-react';
import type { ComplaintCategory } from '../types';

interface CategoryLegendProps {
  counts?: Record<string, number>;
  selectedCategory?: ComplaintCategory | 'all';
  onSelectCategory?: (category: ComplaintCategory | 'all') => void;
  className?: string;
}

const LEGEND_ITEMS: {
  category: ComplaintCategory;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    category: 'pothole',
    label: 'Pothole & Roads',
    color: 'bg-orange-500 text-orange-700 bg-orange-50 border-orange-200',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />,
  },
  {
    category: 'streetlight',
    label: 'Streetlights',
    color: 'bg-amber-500 text-amber-800 bg-amber-50 border-amber-200',
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-600" />,
  },
  {
    category: 'drainage',
    label: 'Drainage & Water',
    color: 'bg-sky-500 text-sky-800 bg-sky-50 border-sky-200',
    icon: <Droplets className="w-3.5 h-3.5 text-sky-600" />,
  },
  {
    category: 'garbage',
    label: 'Garbage & Waste',
    color: 'bg-emerald-500 text-emerald-800 bg-emerald-50 border-emerald-200',
    icon: <Trash2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  {
    category: 'water_supply',
    label: 'Water Supply',
    color: 'bg-cyan-500 text-cyan-800 bg-cyan-50 border-cyan-200',
    icon: <Waves className="w-3.5 h-3.5 text-cyan-600" />,
  },
  {
    category: 'road_damage',
    label: 'Road Damage',
    color: 'bg-red-500 text-red-800 bg-red-50 border-red-200',
    icon: <Route className="w-3.5 h-3.5 text-red-600" />,
  },
  {
    category: 'other',
    label: 'Other Grievances',
    color: 'bg-purple-500 text-purple-800 bg-purple-50 border-purple-200',
    icon: <HelpCircle className="w-3.5 h-3.5 text-purple-600" />,
  },
];

export const CategoryLegend: React.FC<CategoryLegendProps> = ({
  counts,
  selectedCategory = 'all',
  onSelectCategory,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-700">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          Map Category Legend
        </span>
        {onSelectCategory && selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer lowercase"
          >
            reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {LEGEND_ITEMS.map((item) => {
          const isSelected = selectedCategory === item.category;
          const count = counts?.[item.category] ?? null;

          return (
            <button
              key={item.category}
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(isSelected ? 'all' : item.category)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 transition text-left cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-blue-600 border-transparent shadow-xs ' + item.color
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </div>
              {count !== null && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/70 text-slate-800 font-bold shrink-0">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
