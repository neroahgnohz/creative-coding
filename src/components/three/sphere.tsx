import { useState, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface SphereProps {
  radius: number;
  widthSegments: number;
  heightSegments: number;
  isPlaying: boolean;
  currentColumn: number;
}

export interface SphereRef {
  getVertexAmplitudes: (columnIndex: number) => number[];
}

const Sphere = forwardRef<SphereRef, SphereProps>(({ radius, widthSegments, heightSegments, isPlaying, currentColumn }, ref) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [isLeftMouseDown, setIsLeftMouseDown] = useState(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const { camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const currentPositions = useRef<Float32Array | null>(null);
  const currentRadii = useRef<Float32Array | null>(null);

  useImperativeHandle(ref, () => ({
    getVertexAmplitudes: (columnIndex: number) => {
      if (!currentRadii.current) return [];
      
      const amplitudes: number[] = [];
      
      for (let j = 0; j <= heightSegments; j++) {
        const index = j * (widthSegments + 1) + columnIndex;
        amplitudes[j] = currentRadii.current[index];
      }
      
      return amplitudes;
    }
  }));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '=') {  // Only allow increasing radius
        event.preventDefault();

        if (pointsRef.current && currentPositions.current && currentRadii.current) {
          const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
          const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
          
          for (let i = 0; i < positions.length; i += 3) {
            const x = currentPositions.current[i];
            const y = currentPositions.current[i + 1];
            const z = currentPositions.current[i + 2];
            const vertex = new THREE.Vector3(x, y, z);
            
            if (colors[i] > 0) {
              const direction = vertex.clone().normalize();
              currentRadii.current[i/3] += 0.5 * colors[i];
              const targetRadius = currentRadii.current[i/3];
              
              currentPositions.current[i] = direction.x * targetRadius;
              currentPositions.current[i + 1] = direction.y * targetRadius;
              currentPositions.current[i + 2] = direction.z * targetRadius;
              
              positions[i] = currentPositions.current[i];
              positions[i + 1] = currentPositions.current[i + 1];
              positions[i + 2] = currentPositions.current[i + 2];
            }
          }
          pointsRef.current.geometry.attributes.position.needsUpdate = true;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Create points in a sphere shape
  const points = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const radii: number[] = [];
    
    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= heightSegments; j++) {
        const phi = (i / widthSegments) * Math.PI * 2;
        const theta = (j / heightSegments) * Math.PI;
        
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(theta);
        
        positions.push(x, y, z);
        colors.push(0, 0, 1);
        radii.push(radius);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Store current positions and radii
    currentPositions.current = new Float32Array(positions);
    currentRadii.current = new Float32Array(radii);
    
    return geometry;
  }, [radius, widthSegments, heightSegments]);

  const handleMouseMove = (event: ThreeEvent<PointerEvent>) => {
    // Don't handle mouse events if playing
    if (isPlaying) return;

    if (isLeftMouseDown && pointsRef.current) {
      const deltaX = event.clientX - prevMouse.current.x;
      const deltaY = event.clientY - prevMouse.current.y;

      pointsRef.current.rotation.y += deltaX * 0.01;
      pointsRef.current.rotation.x += deltaY * 0.01;

      prevMouse.current.x = event.clientX;
      prevMouse.current.y = event.clientY;
    }

    const pointer = new THREE.Vector2();
    pointer.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
    raycaster.current.setFromCamera( pointer, camera );

    if (pointsRef.current && currentPositions.current) {
        const intersects = raycaster.current.intersectObject(pointsRef.current, false);
        if (intersects.length > 0) {
            const worldPoint = intersects[0].point;
            const localPoint = pointsRef.current.worldToLocal(worldPoint.clone());
            
            // Update colors based on distance from intersection
            const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
            
            for (let i = 0; i < colors.length; i += 3) {
                const x = currentPositions.current[i];
                const y = currentPositions.current[i + 1];
                const z = currentPositions.current[i + 2];
                const vertex = new THREE.Vector3(x, y, z);
                
                const dist = vertex.distanceTo(localPoint);
                const highlight = Math.max(0, 1 - dist / 2.0); // 2.0 is highlight radius
                
                colors[i] = 0 + highlight;     // R
                colors[i + 1] = 0;             // G
                colors[i + 2] = 1 - highlight; // B
            }
            pointsRef.current.geometry.attributes.color.needsUpdate = true;

        } else {
            // Reset colors to blue
            const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
            for (let i = 0; i < colors.length; i += 3) {
                colors[i] = 0;     // R
                colors[i + 1] = 0; // G
                colors[i + 2] = 1; // B
            }
            pointsRef.current.geometry.attributes.color.needsUpdate = true;
        }
    }
  };

  const handleMouseDown = (event: ThreeEvent<PointerEvent>) => {
    // Don't handle mouse events if playing
    if (isPlaying) return;
    
    if (event.button === 0) {
      setIsLeftMouseDown(true);
      prevMouse.current.x = event.clientX;
      prevMouse.current.y = event.clientY;
    }
  };

  const handleMouseUp = (event: ThreeEvent<PointerEvent>) => {
    // Don't handle mouse events if playing
    if (isPlaying) return;
    
    if (event.button === 0) {
      setIsLeftMouseDown(false);
    }
  };

  // Add effect to update colors when playing or currentColumn changes
  useEffect(() => {
    if (!pointsRef.current || !currentPositions.current) return;

    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < colors.length; i += 3) {
      const vertexIndex = i / 3;
      const columnIndex = vertexIndex % (widthSegments + 1);
      
      if (isPlaying && columnIndex === currentColumn) {
        colors[i] = 1;     // R
        colors[i + 1] = 1; // G
        colors[i + 2] = 0; // B
      } else {
        colors[i] = 0;     // R
        colors[i + 1] = 0; // G
        colors[i + 2] = 1; // B
      }
    }
    
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  }, [isPlaying, currentColumn, widthSegments]);

  return (
    <points
      ref={pointsRef}
      geometry={points}
      onPointerMove={handleMouseMove}
      onPointerDown={handleMouseDown}
      onPointerUp={handleMouseUp}
    >
      <pointsMaterial
        size={0.8}
        vertexColors
        sizeAttenuation
      />
    </points>
  );
});

Sphere.displayName = 'Sphere';

export { Sphere };