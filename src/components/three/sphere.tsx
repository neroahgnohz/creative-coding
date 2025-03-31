import { useState } from "react";
import { useRef } from "react";
import { Mesh } from "three";
import { ThreeEvent } from "@react-three/fiber";

interface SphereProps {
  radius: number;
  widthSegments: number;
  heightSegments: number;
}

const Sphere = ({ radius, widthSegments, heightSegments }: SphereProps) => {
  const sphereRef = useRef<Mesh>(null);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  const handleMouseMove = (event: ThreeEvent<PointerEvent>) => {
    if (isRightMouseDown && sphereRef.current) {
      let deltaX = event.clientX - prevMouse.current.x;
      let deltaY = event.clientY - prevMouse.current.y;

      sphereRef.current.rotation.y += deltaX * 0.01;
      sphereRef.current.rotation.x += deltaY * 0.01;

      prevMouse.current.x = event.clientX;
      prevMouse.current.y = event.clientY;
    }
  };

  // Detect right mouse down & up
  const handleMouseDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button === 2) {
      setIsRightMouseDown(true);
      prevMouse.current.x = event.clientX;
      prevMouse.current.y = event.clientY;
    }
  };

  const handleMouseUp = (event: ThreeEvent<PointerEvent>) => {
    if (event.button === 2) {
      setIsRightMouseDown(false);
    }
  };

  return (
    <mesh
      ref={sphereRef}
      onPointerMove={handleMouseMove}
      onPointerDown={handleMouseDown}
      onPointerUp={handleMouseUp}
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
    >
      <sphereGeometry args={[radius, widthSegments, heightSegments]} />
      <meshStandardMaterial color="blue" wireframe />
    </mesh>
  );
};

export { Sphere };