import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { color } from '@/theme';

// The Hold mark (KeptIcon board): an ink K holding an Ember coin, on the
// board's 1024 grid. The K and the coin are separate so the coin can move.

/** The K alone. */
export function KeptK({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <G transform="translate(-8 0)">
        <Rect x={276} y={252} width={96} height={520} rx={48} fill={color.ink} />
        <Path
          d="M380 512 L640 300 M380 512 L640 724"
          fill="none"
          stroke={color.ink}
          strokeWidth={96}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

/** The coin alone, where the K holds it. */
export function KeptCoin({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Circle cx={672} cy={512} r={84} fill={color.accent} />
    </Svg>
  );
}
