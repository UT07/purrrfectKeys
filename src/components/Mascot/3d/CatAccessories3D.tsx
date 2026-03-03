/**
 * CatAccessories3D — Programmatic Three.js accessories for evolved cats.
 *
 * Renders simple geometry accessories (bow-ties, crowns, capes, etc.) as
 * child nodes of the cat model group. Each accessory is positioned relative
 * to the cat's origin (0,0,0) which is roughly at the base/feet.
 *
 * Accessory names come from catCharacters.ts evolutionVisuals[stage].accessories.
 * Unknown names gracefully return null (no crash).
 *
 * ── Chibi Anatomy Anchors (normalized 0-1 space, scaled by MODEL_HEIGHT) ──
 *
 * The SketchFab chibi cat has ~40% body / 60% head proportions.
 * All Y positions reference the CHIBI constants below instead of magic numbers,
 * making it easy to recalibrate if the model changes.
 *
 *   FEET_Y    = 0.00  → paw base
 *   BELLY_Y   = 0.22  → belly/torso center
 *   NECK_Y    = 0.38  → throat/neck (collars, bow-ties, scarves)
 *   CHIN_Y    = 0.42  → chin line
 *   MOUTH_Y   = 0.48  → mouth level
 *   EYE_Y     = 0.58  → eye level (glasses, goggles)
 *   FOREHEAD_Y= 0.68  → forehead
 *   SKULL_TOP_Y=0.82  → top of skull (crowns, hats, tiaras)
 *   EAR_TIP_Y = 0.97  → ear tips
 *
 *   FACE_Z    = 0.21  → front of face (protrudes more on chibi)
 *   BACK_Z    =-0.13  → behind back (shorter/stubbier body)
 */

import type { ReactElement } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────
// Chibi anatomy anchor points (normalized 0-1)
// Adjust these if swapping to a different model.
// ─────────────────────────────────────────────

const CHIBI = {
  FEET_Y: 0.00,
  BELLY_Y: 0.22,
  NECK_Y: 0.38,
  CHIN_Y: 0.42,
  MOUTH_Y: 0.48,
  EYE_Y: 0.58,
  FOREHEAD_Y: 0.68,
  SKULL_TOP_Y: 0.82,
  EAR_TIP_Y: 0.97,

  FACE_Z: 0.21,
  SIDE_Z: 0.10,
  BACK_Z: -0.13,

  /** Half-width of the head at eye level */
  HEAD_HALF_W: 0.16,
  /** Half-width of body at belly */
  BODY_HALF_W: 0.13,
} as const;

// ─────────────────────────────────────────────
// Shared geometry (created once, reused)
// ─────────────────────────────────────────────

const sphereGeom = new THREE.SphereGeometry(1, 12, 8);
const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const torusGeom = new THREE.TorusGeometry(1, 0.15, 8, 24);
const coneGeom = new THREE.ConeGeometry(1, 1, 8);
const cylinderGeom = new THREE.CylinderGeometry(1, 1, 1, 12);

// ─────────────────────────────────────────────
// Wearable accessory components
// ─────────────────────────────────────────────

function BowTie3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.NECK_Y, CHIBI.FACE_Z]}>
      {/* Left wing */}
      <mesh geometry={coneGeom} position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 0.06, 0.03]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Right wing */}
      <mesh geometry={coneGeom} position={[0.06, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.04, 0.06, 0.03]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Center knot */}
      <mesh geometry={sphereGeom} scale={[0.02, 0.02, 0.02]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Crown3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.SKULL_TOP_Y, 0]}>
      {/* Crown base ring */}
      <mesh geometry={cylinderGeom} scale={[0.12, 0.03, 0.12]}>
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Crown points */}
      {[-0.06, 0, 0.06].map((x, i) => (
        <mesh key={i} geometry={coneGeom} position={[x, 0.05, 0]} scale={[0.025, 0.06, 0.025]}>
          <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Gem on center point */}
      <mesh geometry={sphereGeom} position={[0, 0.08, 0]} scale={[0.015, 0.015, 0.015]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function TinyCrown3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0.06, CHIBI.SKULL_TOP_Y - 0.04, 0.02]} rotation={[0, 0, 0.2]}>
      <mesh geometry={cylinderGeom} scale={[0.06, 0.02, 0.06]}>
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh geometry={coneGeom} position={[0, 0.03, 0]} scale={[0.015, 0.04, 0.015]}>
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh geometry={sphereGeom} position={[0, 0.05, 0]} scale={[0.01, 0.01, 0.01]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Tiara3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.SKULL_TOP_Y - 0.04, 0.05]}>
      <mesh geometry={torusGeom} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.1, 0.04]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh geometry={sphereGeom} position={[0, 0.03, 0]} scale={[0.015, 0.02, 0.015]}>
        <meshStandardMaterial color="#FFFFFF" emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Sunglasses3D({ color }: { color: string }): ReactElement {
  const lensColor = new THREE.Color(color).multiplyScalar(0.3).getHexString();
  return (
    <group position={[0, CHIBI.EYE_Y, CHIBI.FACE_Z]}>
      {/* Left lens */}
      <mesh geometry={cylinderGeom} position={[-0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.01, 0.035]}>
        <meshStandardMaterial color={`#${lensColor}`} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Right lens */}
      <mesh geometry={cylinderGeom} position={[0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.01, 0.035]}>
        <meshStandardMaterial color={`#${lensColor}`} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Bridge */}
      <mesh geometry={boxGeom} scale={[0.04, 0.008, 0.008]}>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Monocle3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0.06, CHIBI.EYE_Y, CHIBI.FACE_Z + 0.01]}>
      <mesh geometry={torusGeom} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.04, 0.04]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Chain dangling */}
      <mesh geometry={boxGeom} position={[0.03, -0.04, 0]} scale={[0.003, 0.08, 0.003]}>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Hat3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.SKULL_TOP_Y + 0.02, 0]}>
      {/* Brim */}
      <mesh geometry={cylinderGeom} scale={[0.16, 0.01, 0.14]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Crown of hat */}
      <mesh geometry={cylinderGeom} position={[0, 0.04, 0]} scale={[0.1, 0.06, 0.1]}>
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Beanie3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.SKULL_TOP_Y - 0.04, 0]}>
      <mesh geometry={sphereGeom} scale={[0.14, 0.08, 0.13]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Pom-pom */}
      <mesh geometry={sphereGeom} position={[0, 0.08, 0]} scale={[0.03, 0.03, 0.03]}>
        <meshStandardMaterial color={new THREE.Color(color).offsetHSL(0, 0, 0.2).getHexString()} />
      </mesh>
    </group>
  );
}

function Collar3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.NECK_Y, 0]}>
      <mesh geometry={torusGeom} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.13, 0.06]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Pendant */}
      <mesh geometry={sphereGeom} position={[0, -0.02, 0.12]} scale={[0.015, 0.015, 0.015]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function NecklaceChain3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.NECK_Y, CHIBI.SIDE_Z]}>
      <mesh geometry={torusGeom} rotation={[Math.PI / 2.2, 0, 0]} scale={[0.12, 0.12, 0.04]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function GemPendant3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.NECK_Y - 0.04, CHIBI.FACE_Z - 0.02]}>
      {/* Diamond shape from two cones */}
      <mesh geometry={coneGeom} position={[0, 0.012, 0]} scale={[0.02, 0.02, 0.02]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={coneGeom} position={[0, -0.012, 0]} rotation={[Math.PI, 0, 0]} scale={[0.02, 0.015, 0.02]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function Cape3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.BELLY_Y + 0.05, CHIBI.BACK_Z]}>
      <mesh geometry={boxGeom} scale={[0.28, 0.30, 0.02]}>
        <meshStandardMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Scarf3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.NECK_Y + 0.02, 0]}>
      <mesh geometry={torusGeom} rotation={[Math.PI / 2, 0, 0]} scale={[0.14, 0.14, 0.08]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Dangling end */}
      <mesh geometry={boxGeom} position={[0.12, -0.06, 0.05]} rotation={[0, 0, -0.3]} scale={[0.03, 0.1, 0.02]}>
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Goggles3D({ color }: { color: string }): ReactElement {
  return (
    <group position={[0, CHIBI.EYE_Y + 0.04, CHIBI.SIDE_Z]}>
      {/* Strap */}
      <mesh geometry={torusGeom} rotation={[Math.PI / 2, 0, 0]} scale={[0.14, 0.14, 0.04]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Left lens */}
      <mesh geometry={cylinderGeom} position={[-0.06, -0.04, 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.035, 0.015, 0.035]}>
        <meshStandardMaterial color="#88CCFF" metalness={0.8} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Right lens */}
      <mesh geometry={cylinderGeom} position={[0.06, -0.04, 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.035, 0.015, 0.035]}>
        <meshStandardMaterial color="#88CCFF" metalness={0.8} roughness={0.1} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────
// Held / instrument accessories
// (previously null — now simple geometry)
// ─────────────────────────────────────────────

function Saxophone3D({ color }: { color: string }): ReactElement {
  // Angled golden body + flared bell, resting beside the body
  return (
    <group position={[CHIBI.BODY_HALF_W + 0.04, CHIBI.NECK_Y - 0.05, 0.06]} rotation={[0.2, 0, -0.4]}>
      {/* Main body tube */}
      <mesh geometry={cylinderGeom} scale={[0.018, 0.14, 0.018]}>
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Bell (flared end) */}
      <mesh geometry={coneGeom} position={[0, -0.09, 0.02]} rotation={[0.5, 0, 0]} scale={[0.04, 0.04, 0.04]}>
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Mouthpiece */}
      <mesh geometry={cylinderGeom} position={[0, 0.08, -0.01]} rotation={[0.3, 0, 0]} scale={[0.008, 0.03, 0.008]}>
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

function Fiddle3D({ color }: { color: string }): ReactElement {
  // Simplified violin shape, held beside body
  return (
    <group position={[-CHIBI.BODY_HALF_W - 0.02, CHIBI.NECK_Y - 0.02, 0.04]} rotation={[0.1, 0.3, 0.5]}>
      {/* Body (squashed box) */}
      <mesh geometry={boxGeom} scale={[0.06, 0.10, 0.02]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Neck */}
      <mesh geometry={cylinderGeom} position={[0, 0.08, 0]} scale={[0.008, 0.06, 0.008]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Scroll */}
      <mesh geometry={sphereGeom} position={[0, 0.11, 0]} scale={[0.012, 0.012, 0.012]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Bow (thin stick across) */}
      <mesh geometry={cylinderGeom} position={[0.04, 0, 0]} rotation={[0, 0, 0.1]} scale={[0.003, 0.12, 0.003]}>
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>
    </group>
  );
}

function Baton3D({ color }: { color: string }): ReactElement {
  // Thin conductor's baton held diagonally in front
  return (
    <group position={[CHIBI.BODY_HALF_W + 0.02, CHIBI.NECK_Y, CHIBI.FACE_Z - 0.04]} rotation={[0.3, 0, -0.6]}>
      {/* Handle (dark grip) */}
      <mesh geometry={cylinderGeom} position={[0, -0.03, 0]} scale={[0.008, 0.03, 0.008]}>
        <meshStandardMaterial color="#2C2C2C" />
      </mesh>
      {/* Shaft (white) */}
      <mesh geometry={cylinderGeom} position={[0, 0.05, 0]} scale={[0.004, 0.10, 0.004]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Tip */}
      <mesh geometry={sphereGeom} position={[0, 0.10, 0]} scale={[0.005, 0.005, 0.005]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function CookieWand3D({ color }: { color: string }): ReactElement {
  // Thin stick with a round cookie/star on top
  return (
    <group position={[CHIBI.BODY_HALF_W + 0.03, CHIBI.BELLY_Y + 0.08, 0.06]} rotation={[0, 0, -0.2]}>
      {/* Stick */}
      <mesh geometry={cylinderGeom} scale={[0.005, 0.12, 0.005]}>
        <meshStandardMaterial color="#DEB887" />
      </mesh>
      {/* Cookie (flattened sphere) */}
      <mesh geometry={sphereGeom} position={[0, 0.08, 0]} scale={[0.025, 0.025, 0.01]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Chocolate chips (tiny dots) */}
      {[[-0.01, 0.005], [0.008, -0.005], [0, 0.01]].map(([dx, dy], i) => (
        <mesh key={i} geometry={sphereGeom} position={[dx, 0.08 + dy, 0.01]} scale={[0.004, 0.004, 0.004]}>
          <meshStandardMaterial color="#4E2E1E" />
        </mesh>
      ))}
    </group>
  );
}

function CherryBlossom3D({ color }: { color: string }): ReactElement {
  // Cluster of small petals near the ear — Japanese aesthetic
  const petalPositions: [number, number, number][] = [
    [-0.10, CHIBI.SKULL_TOP_Y + 0.02, 0.04],
    [-0.12, CHIBI.SKULL_TOP_Y - 0.02, 0.06],
    [-0.08, CHIBI.SKULL_TOP_Y + 0.05, 0.02],
    [-0.14, CHIBI.SKULL_TOP_Y, 0.03],
    [-0.09, CHIBI.SKULL_TOP_Y + 0.01, 0.07],
  ];
  return (
    <group>
      {petalPositions.map((pos, i) => (
        <mesh key={i} geometry={sphereGeom} position={pos} scale={[0.012, 0.012, 0.006]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* Center dot (stamen) */}
      <mesh geometry={sphereGeom} position={[-0.10, CHIBI.SKULL_TOP_Y + 0.01, 0.055]} scale={[0.005, 0.005, 0.005]}>
        <meshStandardMaterial color="#FFE4B5" emissive="#FFE4B5" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function Constellation3D({ color }: { color: string }): ReactElement {
  // Tiny glowing star dots orbiting above the head
  const starPositions: [number, number, number][] = [
    [0.10, CHIBI.SKULL_TOP_Y + 0.10, 0.05],
    [-0.08, CHIBI.SKULL_TOP_Y + 0.14, -0.03],
    [0.03, CHIBI.SKULL_TOP_Y + 0.18, 0.06],
    [-0.12, CHIBI.SKULL_TOP_Y + 0.08, 0.08],
    [0.07, CHIBI.SKULL_TOP_Y + 0.16, -0.05],
    [-0.04, CHIBI.SKULL_TOP_Y + 0.12, -0.07],
  ];
  return (
    <group>
      {starPositions.map((pos, i) => (
        <mesh key={i} geometry={sphereGeom} position={pos} scale={[0.006, 0.006, 0.006]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Connecting lines (thin cylinders between adjacent stars) */}
      <mesh geometry={boxGeom} position={[0.01, CHIBI.SKULL_TOP_Y + 0.12, 0.01]} rotation={[0.2, 0, 0.5]} scale={[0.002, 0.10, 0.002]}>
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <mesh geometry={boxGeom} position={[-0.05, CHIBI.SKULL_TOP_Y + 0.11, 0.02]} rotation={[-0.1, 0, -0.3]} scale={[0.002, 0.08, 0.002]}>
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function SpeedAura3D({ color }: { color: string }): ReactElement {
  // Translucent speed rings around the body
  return (
    <group>
      <mesh geometry={torusGeom} position={[0, CHIBI.BELLY_Y + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.18, 0.18, 0.04]}>
        <meshStandardMaterial color={color} transparent opacity={0.25} />
      </mesh>
      <mesh geometry={torusGeom} position={[0, CHIBI.BELLY_Y + 0.08, 0]} rotation={[Math.PI / 2.1, 0, 0.2]} scale={[0.20, 0.20, 0.03]}>
        <meshStandardMaterial color={color} transparent opacity={0.15} />
      </mesh>
      <mesh geometry={torusGeom} position={[0, CHIBI.BELLY_Y - 0.04, 0]} rotation={[Math.PI / 1.9, 0, -0.1]} scale={[0.16, 0.16, 0.03]}>
        <meshStandardMaterial color={color} transparent opacity={0.20} />
      </mesh>
    </group>
  );
}

function Candelabra3D({ color }: { color: string }): ReactElement {
  // Small candelabra beside the body (3 candles on a base)
  return (
    <group position={[-CHIBI.BODY_HALF_W - 0.04, CHIBI.BELLY_Y + 0.04, 0.02]}>
      {/* Base */}
      <mesh geometry={cylinderGeom} scale={[0.03, 0.01, 0.03]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Stem */}
      <mesh geometry={cylinderGeom} position={[0, 0.03, 0]} scale={[0.006, 0.04, 0.006]}>
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Arms + candles */}
      {[-0.025, 0, 0.025].map((x, i) => (
        <group key={i} position={[x, 0.05, 0]}>
          <mesh geometry={cylinderGeom} scale={[0.005, 0.025, 0.005]}>
            <meshStandardMaterial color="#FFFFF0" />
          </mesh>
          {/* Flame */}
          <mesh geometry={coneGeom} position={[0, 0.02, 0]} scale={[0.006, 0.012, 0.006]}>
            <meshStandardMaterial color="#FFA500" emissive="#FF8C00" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.07, 0]} color="#FFA500" intensity={0.5} distance={0.5} />
    </group>
  );
}

function PianoThrone3D({ color }: { color: string }): ReactElement {
  // Simple bench/throne behind the cat
  return (
    <group position={[0, CHIBI.FEET_Y + 0.03, CHIBI.BACK_Z - 0.04]}>
      {/* Seat cushion */}
      <mesh geometry={boxGeom} position={[0, 0.04, 0]} scale={[0.18, 0.02, 0.10]}>
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Legs */}
      {[[-0.07, -0.04], [0.07, -0.04], [-0.07, 0.04], [0.07, 0.04]].map(([x, z], i) => (
        <mesh key={i} geometry={cylinderGeom} position={[x, 0, z]} scale={[0.01, 0.04, 0.01]}>
          <meshStandardMaterial color="#2C2C2C" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// Evolution glow effect
// ─────────────────────────────────────────────

function EvolutionGlow3D({ color, intensity }: { color: string; intensity: number }): ReactElement {
  return (
    <group>
      <pointLight position={[0, CHIBI.MOUTH_Y, 0.3]} color={color} intensity={intensity * 2} distance={2} />
      {/* Subtle aura sphere */}
      <mesh geometry={sphereGeom} position={[0, CHIBI.BELLY_Y + 0.10, 0]} scale={[0.35, 0.45, 0.3]}>
        <meshStandardMaterial color={color} transparent opacity={intensity * 0.15} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────
// Accessory name → component dispatch
// ─────────────────────────────────────────────

/** Render a single named accessory. Returns null for unknown names. */
function renderAccessory3D(name: string, accent: string): ReactElement | null {
  switch (name) {
    // Bow ties / ribbons
    case 'bow-tie':
    case 'pink-bow':
    case 'velvet-ribbon':
      return <BowTie3D key={name} color={accent} />;

    // Crowns / tiaras
    case 'crown':
      return <Crown3D key={name} color={accent} />;
    case 'tiny-crown':
      return <TinyCrown3D key={name} color={accent} />;
    case 'tiara':
    case 'tiara-gold':
      return <Tiara3D key={name} color="#FFD700" />;
    case 'tiara-silver':
      return <Tiara3D key={name} color="#C0C0C0" />;

    // Glasses / goggles
    case 'sunglasses':
      return <Sunglasses3D key={name} color="#222222" />;
    case 'monocle':
      return <Monocle3D key={name} color="#C4A000" />;
    case 'racing-goggles':
    case 'pixel-glasses':
    case 'round-glasses':
      return <Goggles3D key={name} color={accent} />;

    // Hats
    case 'fedora':
    case 'trilby':
      return <Hat3D key={name} color="#3A3A3A" />;
    case 'flat-cap':
      return <Hat3D key={name} color="#6B8E23" />;
    case 'chef-hat':
      return <Hat3D key={name} color="#FFFFFF" />;
    case 'beanie':
      return <Beanie3D key={name} color={accent} />;
    case 'golden-headphones':
      return <Goggles3D key={name} color="#FFD700" />;

    // Neck / collars
    case 'scarf':
      return <Scarf3D key={name} color={accent} />;
    case 'crescent-collar':
    case 'lightning-collar':
      return <Collar3D key={name} color={accent} />;
    case 'pearl-necklace':
      return <NecklaceChain3D key={name} color="#FFF5EE" />;
    case 'gold-chain':
      return <NecklaceChain3D key={name} color="#FFD700" />;
    case 'kimono-sash':
      return <Scarf3D key={name} color={accent} />;
    case 'temple-bell':
      return <GemPendant3D key={name} color="#FFD700" />;

    // Capes / robes
    case 'cape':
    case 'cape-purple':
      return <Cape3D key={name} color={accent} />;
    case 'golden-cape':
    case 'royal-robe':
    case 'royal-cape-white':
      return <Cape3D key={name} color="#FFD700" />;
    case 'apron':
    case 'conductor-coat':
      return <Cape3D key={name} color={accent} />;

    // Pendants / gems
    case 'gem-pendant':
    case 'accessory-2':
      return <GemPendant3D key={name} color={accent} />;

    // Generic accessory-1 (simple collar)
    case 'accessory-1':
      return <Collar3D key={name} color={accent} />;
    case 'accessory-3':
      return <Crown3D key={name} color={accent} />;

    // Held instruments / props
    case 'sax':
      return <Saxophone3D key={name} color="#DAA520" />;
    case 'fiddle':
      return <Fiddle3D key={name} color="#8B4513" />;
    case 'baton':
      return <Baton3D key={name} color="#FFFFFF" />;
    case 'cookie-wand':
      return <CookieWand3D key={name} color="#F4A460" />;

    // Decorative auras / effects
    case 'cherry-blossom':
      return <CherryBlossom3D key={name} color="#FFB7C5" />;
    case 'constellation':
      return <Constellation3D key={name} color={accent} />;
    case 'speed-aura':
      return <SpeedAura3D key={name} color={accent} />;

    // Props
    case 'candelabra':
      return <Candelabra3D key={name} color="#C0A060" />;
    case 'piano-throne':
      return <PianoThrone3D key={name} color={accent} />;

    default:
      return null;
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

interface CatAccessories3DProps {
  /** Accessory name list from catCharacters.ts evolutionVisuals */
  accessories: string[];
  /** Accent color (hex) for the cat */
  accentColor: string;
  /** Whether this stage has glow */
  hasGlow: boolean;
  /** Aura intensity 0-1 */
  auraIntensity: number;
}

/**
 * Renders all 3D accessories for a cat at its current evolution stage.
 * Add as a child of the cat model's <group>.
 */
export function CatAccessories3D({
  accessories,
  accentColor,
  hasGlow,
  auraIntensity,
}: CatAccessories3DProps): ReactElement {
  return (
    <group>
      {accessories.map((name) => renderAccessory3D(name, accentColor))}
      {hasGlow && auraIntensity > 0 && (
        <EvolutionGlow3D color={accentColor} intensity={auraIntensity} />
      )}
    </group>
  );
}
