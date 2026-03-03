import type { ReactElement } from 'react';
import { G, Ellipse } from 'react-native-svg';

export function CatShadows(): ReactElement {
  return (
    <G>
      {/* Chin shadow at head-body junction */}
      <Ellipse cx="50" cy="60" rx="18" ry="4" fill="#000000" opacity={0.06} />
      {/* Ground shadow */}
      <Ellipse cx="50" cy="96" rx="24" ry="3" fill="#000000" opacity={0.08} />
      {/* Left paw shadow */}
      <Ellipse cx="42" cy="94" rx="5" ry="1.5" fill="#000000" opacity={0.05} />
      {/* Right paw shadow */}
      <Ellipse cx="58" cy="94" rx="5" ry="1.5" fill="#000000" opacity={0.05} />
    </G>
  );
}
