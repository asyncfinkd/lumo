import Svg, { Path, Rect } from 'react-native-svg';

/** The clipboard with a sparkle on empty History (HistoryEmpty). */
export function EmptyClipboard() {
  return (
    <Svg width={80} height={92} viewBox="0 0 46 54" accessible={false}>
      <Rect x={13} y={1.5} width={20} height={9} rx={4.5} fill="#D7AF86" />
      <Rect x={15} y={3} width={16} height={2.5} rx={1.25} fill="#E6C6A2" />
      <Rect x={10} y={9} width={26} height={6} rx={3} fill="#F3E7DB" />
      <Rect x={5} y={14} width={36} height={38} rx={14} fill="#FBF3EA" />
      <Rect x={10} y={19} width={4} height={12} rx={2} fill="#FFFFFF" />
      <Path
        d="M33 24c.5 2.4 1.4 3.3 3.8 3.8-2.4.5-3.3 1.4-3.8 3.8-.5-2.4-1.4-3.3-3.8-3.8 2.4-.5 3.3-1.4 3.8-3.8z"
        fill="#F5C86A"
      />
    </Svg>
  );
}
