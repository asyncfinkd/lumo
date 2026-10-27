import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { CategoryIconKey } from '@/db/categories';

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

// The twelve category icons (ProfileCategoryEdit): a filled shape and its lines.
const CATEGORY_PATHS: Record<CategoryIconKey | 'none' | 'adjust', [string, string]> = {
  basket: ['M4 9.5h16l-1.5 8.8a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z', 'm8 9.5 3-5.5M16 9.5l-3-5.5'],
  coffee: [
    'M4.5 9h12v4.5a5.5 5.5 0 0 1-5.5 5.5h-1a5.5 5.5 0 0 1-5.5-5.5z',
    'M16.5 10.5H18a2.5 2.5 0 0 1 0 5h-1.8M8.5 3.5c-.6.8-.6 1.7 0 2.5M12.5 3.5c-.6.8-.6 1.7 0 2.5',
  ],
  car: [
    'M4 13.5 5.8 8.4A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.4l1.8 5.1V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
    'M7 18v1.5M17 18v1.5M4 13.5h16',
  ],
  gift: [
    'M4 12a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z',
    'M12 9v11M4 13.5h16M12 9c-1.4-2.8-4.5-3.3-4.5-1.2S10.2 9 12 9s4.5-.9 4.5-1.2S13.4 6.2 12 9z',
  ],
  bolt: ['M13 3 5 13.5h6l-1 7.5 8-10.5h-6z', ''],
  house: ['M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2h-3.5v-5h-5v5H6a2 2 0 0 1-2-2z', ''],
  heart: [
    'M12 20s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z',
    '',
  ],
  wallet: [
    'M6.5 6.5h11a3.5 3.5 0 0 1 3.5 3.5v4a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 14v-4a3.5 3.5 0 0 1 3.5-3.5z',
    'M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0',
  ],
  music: [
    'M4.5 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M14.5 15a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M10.5 17V6l10-2v11',
  ],
  book: [
    'M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5z',
    'M5 17.5A2.5 2.5 0 0 1 7.5 15H17',
  ],
  paw: [
    'M12 12c-3 0-5 3-5 5.2 0 1.6 1.4 2.3 2.8 1.8 1.6-.6 2.8-.6 4.4 0 1.4.5 2.8-.2 2.8-1.8C17 15 15 12 12 12z',
    'M5.2 10a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M8.7 6.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M12.7 6.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0M16.2 10a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0',
  ],
  shirt: [
    'M8 4 4 6.5l1.8 4L8 9.5V20h8V9.5l2.2 1 1.8-4L16 4c-.6 1.6-2.1 2.5-4 2.5S8.6 5.6 8 4z',
    '',
  ],
  // "No category" (ProfileCategoryDelete).
  none: ['M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z', 'M8.5 12h7'],
  // "Balance adjusted" rows (RowTypes): two sliders.
  adjust: [
    'M13.4 7.5a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0M6.4 16.5a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0',
    'M4 7.5h9M19 7.5h1M4 16.5h3M11 16.5h9',
  ],
};

export function CategoryIcon({
  icon,
  size = 24,
  color,
}: IconProps & { icon: CategoryIconKey | 'none' | 'adjust' }) {
  const s = line(color);
  const [shape, lines] = CATEGORY_PATHS[icon] ?? CATEGORY_PATHS.none;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path {...s} fill={color} fillOpacity={0.22} d={shape} />
      {lines ? <Path {...s} d={lines} /> : null}
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

// Profile (#53): row icons, 20pt, 1.9 stroke.
const rowLine = (color: string) => line(color, 1.9);

export function PersonIcon({ color }: { color: string }) {
  const s = rowLine(color);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Circle {...s} fill={color} fillOpacity={0.22} cx={12} cy={8.5} r={4} />
      <Path {...s} d="M4.5 20c1.5-3.4 4.3-5 7.5-5s6 1.6 7.5 5" />
    </Svg>
  );
}

/** Bills that repeat; also the small badge on automatic rows. */
export function RepeatIcon({ color, size = 20, width = 1.9 }: IconProps & { width?: number }) {
  const s = line(color, width);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path {...s} d="m17 2.5 3 3-3 3" />
      <Path {...s} d="M4 11.5v-1a5 5 0 0 1 5-5h11" />
      <Path {...s} d="m7 21.5-3-3 3-3" />
      <Path {...s} d="M20 12.5v1a5 5 0 0 1-5 5H4" />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, 2.2)} d="M14.5 6 8.5 12l6 6" />
    </Svg>
  );
}

export function SearchIcon({ color, size = 20 }: IconProps) {
  const s = line(color, 2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Circle {...s} fill={color} fillOpacity={0.15} cx={11} cy={11} r={6.5} />
      <Path {...s} d="m16 16 4.5 4.5" />
    </Svg>
  );
}

export function GlobeIcon({ color }: { color: string }) {
  const s = rowLine(color);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Circle {...s} cx={12} cy={12} r={8.5} />
      <Path
        {...s}
        fill={color}
        fillOpacity={0.15}
        d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z"
      />
    </Svg>
  );
}

export function DownloadIcon({ color }: { color: string }) {
  const s = rowLine(color);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path {...s} d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5" />
      <Path
        {...s}
        fill={color}
        fillOpacity={0.15}
        d="M4.5 15.5v2a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-2"
      />
    </Svg>
  );
}

export function CameraIcon({
  color,
  size = 20,
  width = 1.9,
  fillOpacity = 0.22,
}: IconProps & { width?: number; fillOpacity?: number }) {
  const s = line(color, width);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        {...s}
        fill={color}
        fillOpacity={fillOpacity}
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"
      />
      <Circle {...s} cx={12} cy={12.5} r={3.2} />
    </Svg>
  );
}

export function ImageIcon({ color }: { color: string }) {
  const s = rowLine(color);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Rect {...s} fill={color} fillOpacity={0.22} x={3.5} y={4.5} width={17} height={15} rx={4} />
      <Circle {...s} cx={9} cy={9.5} r={1.6} />
      <Path {...s} d="m4 17 5-4.5 3.5 3 2.5-2 5 4" />
    </Svg>
  );
}

export function TrashIcon({ color, size = 20 }: IconProps) {
  const s = rowLine(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        {...s}
        fill={color}
        fillOpacity={0.18}
        d="M6 7.5h12l-1 11.2a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8z"
      />
      <Path {...s} d="M4.5 7.5h15M9.5 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v2" />
    </Svg>
  );
}

export function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, 2.4)} d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
      <Path {...line(color, 3)} d="m5.5 12.5 4 4 9-9" />
    </Svg>
  );
}

/** Profile → Categories. */
export function GridIcon({ color }: { color: string }) {
  const s = rowLine(color);
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Rect {...s} fill={color} fillOpacity={0.22} x={4} y={4} width={7} height={7} rx={2.2} />
      <Rect {...s} x={13} y={4} width={7} height={7} rx={2.2} />
      <Rect {...s} x={4} y={13} width={7} height={7} rx={2.2} />
      <Rect {...s} fill={color} fillOpacity={0.22} x={13} y={13} width={7} height={7} rx={2.2} />
    </Svg>
  );
}

/** Money coming in: Profile's Monthly income row. */
export function MoneyIcon({ color, size = 20 }: IconProps) {
  const s = rowLine(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Rect {...s} fill={color} fillOpacity={0.22} x={3} y={6.5} width={18} height={11} rx={3.5} />
      <Circle {...s} cx={12} cy={12} r={2.5} />
    </Svg>
  );
}
