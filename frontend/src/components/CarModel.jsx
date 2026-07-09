import { Component, Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function Wheel({ position }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.36, 0.36, 0.26, 28]} />
      <meshStandardMaterial color="#0f0f11" metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

// A clickable marker over a system. Children of the car group, so they stay
// attached to the right part as you orbit.
function Hotspot({ system, selected, onSelect }) {
  const on = selected === system.key;
  return (
    <mesh
      position={system.hotspot}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(on ? null : system.key);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[on ? 0.14 : 0.1, 16, 16]} />
      <meshStandardMaterial
        color={on ? "#5a8cf0" : "#7ba3f4"}
        emissive={on ? "#5a8cf0" : "#22376e"}
        emissiveIntensity={on ? 1 : 0.5}
      />
    </mesh>
  );
}

// The procedural low-poly car, built from primitives. Used as the default body
// and as the fallback whenever a real model is missing or fails to load.
function ProceduralBody() {
  return (
    <>
      <RoundedBox args={[3.6, 0.55, 1.7]} radius={0.12} smoothness={4} position={[0, 0.5, 0]} castShadow>
        <meshStandardMaterial color="#5a8cf0" metalness={0.5} roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[1.9, 0.5, 1.45]} radius={0.14} smoothness={4} position={[-0.15, 0.95, 0]} castShadow>
        <meshStandardMaterial color="#18181b" metalness={0.3} roughness={0.2} />
      </RoundedBox>
      <RoundedBox args={[1.2, 0.07, 0.32]} radius={0.03} smoothness={2} position={[1.05, 0.79, 0]}>
        <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />
      </RoundedBox>
      <Wheel position={[1.15, 0.35, 0.85]} />
      <Wheel position={[1.15, 0.35, -0.85]} />
      <Wheel position={[-1.15, 0.35, 0.85]} />
      <Wheel position={[-1.15, 0.35, -0.85]} />
    </>
  );
}

// Loads a real glTF/GLB and drops it in. Downloaded models come in wildly
// different sizes/origins, so by default we auto-fit: scale to a sensible length
// and sit the model on the ground. The registry can override with an explicit
// scale (+ position / rotation) for fine control.
function GLTFCar({ model, config }) {
  const { scene } = useGLTF(model.url);
  const invalidate = useThree((s) => s.invalidate);
  const rot = model.rotation ?? [0, 0, 0];
  // Clone (so we never mutate the cached scene) and bake in the registry rotation,
  // so the auto-fit measures + centers the car in its FINAL orientation.
  const object = useMemo(() => {
    const o = scene.clone(true);
    o.rotation.set(rot[0], rot[1], rot[2]);
    o.updateMatrixWorld(true);
    return o;
  }, [scene, rot[0], rot[1], rot[2]]);
  const fit = useMemo(() => {
    if (model.scale != null) {
      return { scale: model.scale, position: model.position ?? [0, 0, 0] };
    }
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 3.4 / maxDim; // ~3.4 units long, matching the procedural car
    return { scale: s, position: [-center.x * s, -box.min.y * s, -center.z * s] };
  }, [object, model]);

  // M1 — body paint: recolour the materials named in the parts registry to the
  // Showroom's selected paint. scene.clone() shares materials by reference with the
  // useGLTF cache, so we clone each target material ONCE per instance before
  // mutating (else picking a colour would bleed across every car on screen).
  const paint = config?.paint ?? null; // "#rrggbb" to repaint, or null for Original
  const paintTargets = config?.paintTargets ?? null;
  useLayoutEffect(() => {
    if (!paintTargets?.length) return;
    const targets = new Set(paintTargets);
    const repaint = (m) => {
      if (!targets.has(m.name)) return m;
      // Original selected and this material was never repainted → leave it authored.
      if (!paint && !m.userData?.__paintClone) return m;
      // Clone once per instance (scene.clone shares materials with the useGLTF
      // cache) and stash the authored colour/metalness so Original can restore it.
      let mat = m;
      if (!m.userData?.__paintClone) {
        mat = m.clone();
        mat.userData = { ...mat.userData, __paintClone: true, __origColor: m.color.clone(), __origMetal: m.metalness };
      }
      if (paint) {
        mat.color.set(paint);
        mat.metalness = 0; // paint is dielectric; the studio lighting gives the sheen
      } else {
        mat.color.copy(mat.userData.__origColor); // Original → restore authored paint
        mat.metalness = mat.userData.__origMetal;
      }
      mat.needsUpdate = true;
      return mat;
    };
    object.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      n.material = Array.isArray(n.material) ? n.material.map(repaint) : repaint(n.material);
    });
    invalidate(); // demand frameloop: commit a frame after the recolour
  }, [object, paint, paintTargets, invalidate]);

  return <primitive object={object} scale={fit.scale} position={fit.position} />;
}

// If a model fails to load (bad file, 404, decode error), fall back to the
// procedural car instead of crashing the whole 3D tab.
class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev) {
    if (prev.modelKey !== this.props.modelKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// The car in the scene: a real glTF model when the registry has one, otherwise
// the procedural placeholder. Hotspots overlay either body.
export default function CarModel({
  spin = true,
  systems = null,
  selected = null,
  onSelect = () => {},
  model = null,
  config = null,
}) {
  const group = useRef();
  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={group}>
      {model ? (
        // Real model: render nothing while the glTF downloads (fallback=null)
        // so the low-poly block car never flashes in ahead of the actual car.
        // ProceduralBody stays only as the *error* fallback (bad file / 404),
        // where showing something beats a blank stage.
        <ModelBoundary modelKey={model.url} fallback={<ProceduralBody />}>
          <Suspense fallback={null}>
            <GLTFCar model={model} config={config} />
          </Suspense>
        </ModelBoundary>
      ) : (
        // No model for this car: the block car IS its representation.
        <ProceduralBody />
      )}

      {systems &&
        systems
          .filter((s) => s.hotspot)
          .map((s) => <Hotspot key={s.key} system={s} selected={selected} onSelect={onSelect} />)}
    </group>
  );
}
