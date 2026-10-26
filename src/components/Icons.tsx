import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { CategoryId } from '@/db/categories';

// Icons copied path-for-path from the Budget Tracker design boards.
// Most share one style: 1.8 stroke, round caps/joins, 22% tinted fill.

type IconProps = { size?: number; color: string };

const line = (color: string, width = 1.8) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

// Income categories share one icon: money coming in.
const INCOME: CategoryId[] = ['salary', 'freelance', 'gift', 'refund'];

export function CategoryIcon({ id, size = 24, color }: IconProps & { id: CategoryId }) {
  const s = line(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {INCOME.includes(id) && (
        <>
          <Rect
            {...s}
            fill={color}
            fillOpacity={0.22}
            x={3}
            y={6.5}
            width={18}
            height={11}
            rx={3.5}
          />
          <Circle {...s} cx={12} cy={12} r={2.5} />
        </>
      )}
      {id === 'home' && (
        <Path
          {...s}
          fill={color}
          fillOpacity={0.22}
          d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2h-3.5v-5h-5v5H6a2 2 0 0 1-2-2z"
        />
      )}
      {id === 'groceries' && (
        <>
          <Path
            {...s}
            fill={color}
            fillOpacity={0.22}
            d="M4 9.5h16l-1.5 8.8a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"
          />
          <Path {...s} d="m8 9.5 3-5.5M16 9.5l-3-5.5" />
        </>
      )}
      {id === 'transport' && (
        <>
          <Path
            {...s}
            fill={color}
            fillOpacity={0.22}
            d="M4 13.5 5.8 8.4A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.4l1.8 5.1V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"
          />
          <Path {...s} d="M7 18v1.5M17 18v1.5M4 13.5h16" />
        </>
      )}
      {id === 'coffee' && (
        <>
          <Path
            {...s}
            fill={color}
            fillOpacity={0.22}
            d="M4.5 9h12v4.5a5.5 5.5 0 0 1-5.5 5.5h-1a5.5 5.5 0 0 1-5.5-5.5z"
          />
          <Path {...s} d="M16.5 10.5H18a2.5 2.5 0 0 1 0 5h-1.8" />
          <Path {...s} d="M8.5 3.5c-.6.8-.6 1.7 0 2.5M12.5 3.5c-.6.8-.6 1.7 0 2.5" />
        </>
      )}
      {id === 'treats' && (
        <>
          <Rect {...s} fill={color} fillOpacity={0.22} x={4} y={9} width={16} height={11} rx={3} />
          <Path {...s} d="M12 9v11M4 13.5h16" />
          <Path
            {...s}
            d="M12 9c-1.4-2.8-4.5-3.3-4.5-1.2S10.2 9 12 9s4.5-.9 4.5-1.2S13.4 6.2 12 9z"
          />
        </>
      )}
      {id === 'bills' && (
        <Path {...s} fill={color} fillOpacity={0.22} d="M13 3 5 13.5h6l-1 7.5 8-10.5h-6z" />
      )}
    </Svg>
  );
}

export type TabIconName = 'home' | 'insights' | 'budgets' | 'profile';

export function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  const s = line(color);
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
      {name === 'home' && (
        <Path
          {...s}
          fill={color}
          fillOpacity={0.22}
          d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2h-3.5v-5h-5v5H6a2 2 0 0 1-2-2z"
        />
      )}
      {name === 'insights' && (
        <>
          <Path {...s} fill={color} fillOpacity={0.22} d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z" />
          <Path {...s} d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z" />
        </>
      )}
      {name === 'budgets' && (
        <>
          <Rect
            {...s}
            fill={color}
            fillOpacity={0.22}
            x={3.5}
            y={6.5}
            width={17}
            height={13}
            rx={4}
          />
          <Path {...s} d="M16 13h1.5" />
          <Path {...s} d="M6.5 6.5 15 3.8a1.5 1.5 0 0 1 2 1.4v1.3" />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle {...s} fill={color} fillOpacity={0.22} cx={12} cy={8.5} r={4} />
          <Path {...s} d="M4.5 20c1.5-3.4 4.3-5 7.5-5s6 1.6 7.5 5" />
        </>
      )}
    </Svg>
  );
}

export function PlusIcon({ size = 26, color, width = 2.4 }: IconProps & { width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, width)} d="M12 5.5v13M5.5 12h13" />
    </Svg>
  );
}

export function MinusIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, 2.4)} d="M6 12h12" />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, 2.4)} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

export function CameInIcon({ color }: { color: string }) {
  const s = line(color, 1.9);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Rect {...s} fill={color} fillOpacity={0.22} x={3} y={8} width={14} height={12} rx={3.5} />
      <Path {...s} d="M13.5 14h.5" />
      <Path {...s} d="M19.5 2.5v5M17 5h5" />
    </Svg>
  );
}

export function WentOutIcon({ color }: { color: string }) {
  const s = line(color, 1.9);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path
        {...s}
        fill={color}
        fillOpacity={0.22}
        d="M5 8.5h14l-1 10.6a2 2 0 0 1-2 1.9H8a2 2 0 0 1-2-1.9z"
      />
      <Path {...s} d="M9 11V7.5a3 3 0 0 1 6 0V11" />
    </Svg>
  );
}

export function SparkleIcon({ color }: { color: string }) {
  const s = line(color);
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path
        {...s}
        fill={color}
        fillOpacity={0.25}
        d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"
      />
      <Path {...s} d="M19 16.5v4M17 18.5h4" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 18, width = 1.9 }: IconProps & { width?: number }) {
  const s = line(color, width);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Rect {...s} fill={color} fillOpacity={0.2} x={4} y={5.5} width={16} height={14.5} rx={4} />
      <Path {...s} d="M4 10h16M8.5 3.5v3M15.5 3.5v3" />
    </Svg>
  );
}

/** EditBudget's nudge row. */
export function BellIcon({ color }: { color: string }) {
  const s = line(color);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path
        {...s}
        fill={color}
        fillOpacity={0.2}
        d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"
      />
      <Path {...s} d="M10 20a2.2 2.2 0 0 0 4 0" />
    </Svg>
  );
}

export function NoteIcon({ color }: { color: string }) {
  const s = line(color, 1.9);
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
      <Path {...s} fill={color} fillOpacity={0.2} d="M14.5 5.5l4 4L9 19H5v-4z" />
      <Path {...s} d="M13 7l4 4" />
    </Svg>
  );
}

export function BackspaceIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}>
      <Path
        {...line(color)}
        fill={color}
        fillOpacity={0.1}
        d="M9 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5.5-6z"
      />
      <Path {...line(color)} d="m12 10 4 4M16 10l-4 4" />
    </Svg>
  );
}

export type BillIconName =
  | 'rent'
  | 'utilities'
  | 'internet'
  | 'phone'
  | 'gym'
  | 'insurance'
  | 'netflix'
  | 'spotify'
  | 'other';

/** Bill tiles in onboarding (OBBills). */
export function BillIcon({ name, color }: { name: BillIconName; color: string }) {
  const s = line(color, 1.9);
  const tint = { fill: color, fillOpacity: 0.22 };
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      {name === 'rent' && (
        <Path
          {...s}
          {...tint}
          d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2h-3.5v-5h-5v5H6a2 2 0 0 1-2-2z"
        />
      )}
      {name === 'utilities' && <Path {...s} {...tint} d="M13 3 5 13.5h6l-1 7.5 8-10.5h-6z" />}
      {name === 'internet' && (
        <>
          <Path
            {...s}
            d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"
          />
          <Circle cx={12} cy={19} r={1.4} fill={color} />
        </>
      )}
      {name === 'phone' && (
        <>
          <Rect {...s} {...tint} x={6.5} y={2.5} width={11} height={19} rx={3.5} />
          <Path {...s} d="M10.5 18.5h3" />
        </>
      )}
      {name === 'gym' && (
        <>
          <Rect {...s} {...tint} x={5} y={7} width={3.5} height={10} rx={1.75} />
          <Rect {...s} {...tint} x={15.5} y={7} width={3.5} height={10} rx={1.75} />
          <Path {...s} d="M8.5 12h7M2.5 10v4M21.5 10v4" />
        </>
      )}
      {name === 'insurance' && (
        <>
          <Path {...s} {...tint} d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z" />
          <Path {...s} d="m9 12 2 2 4-4" />
        </>
      )}
      {name === 'netflix' && (
        <>
          <Rect {...s} {...tint} x={3} y={4.5} width={18} height={13} rx={3.5} />
          <Path {...s} d="M8.5 21h7" />
          <Path {...s} d="m10.5 8.5 4 2.5-4 2.5z" />
        </>
      )}
      {name === 'spotify' && (
        <>
          <Circle {...s} {...tint} cx={7.5} cy={17} r={3} />
          <Circle {...s} {...tint} cx={17.5} cy={15} r={3} />
          <Path {...s} d="M10.5 17V6l10-2v11" />
        </>
      )}
      {name === 'other' && <Path {...line(color, 2.2)} d="M12 5.5v13M5.5 12h13" />}
    </Svg>
  );
}

export function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, 2.4)} d="m6 9 6 6 6-6" />
    </Svg>
  );
}
