import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const AutoAnimation3D = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);
    sceneRef.current = scene;

    // Camera Setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);
    cameraRef.current = camera;

    // Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create Auto (Simple Box-based representation)
    const autoGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3b82f6,
      metalness: 0.6,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.z = 0;
    autoGroup.add(body);

    // Top (cabin)
    const cabinGeometry = new THREE.BoxGeometry(1.6, 0.8, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2563eb,
      metalness: 0.5,
      roughness: 0.3
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    cabin.position.set(0, 1, -0.3);
    autoGroup.add(cabin);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1f2937,
      metalness: 0.8,
      roughness: 0.3
    });

    const wheelPositions = [
      { x: -0.8, z: 1 },
      { x: 0.8, z: 1 },
      { x: -0.8, z: -1 },
      { x: 0.8, z: -1 }
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.5, pos.z);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      autoGroup.add(wheel);
    });

    // Windows
    const windowGeometry = new THREE.PlaneGeometry(1.2, 0.5);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });

    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(0, 1, 0.3);
    window1.position.z += 0.01;
    autoGroup.add(window1);

    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(0, 1, -0.8);
    window2.position.z += 0.01;
    autoGroup.add(window2);

    scene.add(autoGroup);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe5e7eb,
      metalness: 0.1,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lighting setup for ground
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Animation Timeline
    const tl = gsap.timeline({ repeat: -1 });
    
    // Rotate auto
    tl.to(autoGroup.rotation, {
      y: Math.PI * 2,
      duration: 8,
      ease: 'none'
    }, 0);

    // Bounce animation
    tl.to(autoGroup.position, {
      y: 0.3,
      duration: 1,
      ease: 'sine.inOut'
    }, 0)
    .to(autoGroup.position, {
      y: 0,
      duration: 1,
      ease: 'sine.inOut'
    }, 1);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      cabinGeometry.dispose();
      cabinMaterial.dispose();
      wheelGeometry.dispose();
      wheelMaterial.dispose();
      windowGeometry.dispose();
      windowMaterial.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0.5rem',
        marginBottom: '2rem'
      }}
    />
  );
};

export default AutoAnimation3D;
