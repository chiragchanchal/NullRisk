'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { Activity, ShieldCheck } from 'lucide-react'

interface RiskGlobeCanvasProps {
  pnlPct?: number
  totalValue?: number
}

export function RiskGlobeCanvas({ pnlPct = 0, totalValue = 500000 }: RiskGlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const isPositive = pnlPct >= 0

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth || 320
    const height = container.clientHeight || 260

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 5.2

    // 2. Renderer with transparent background and high DPI antialiasing
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 3. Theme Colors based on P&L state
    const primaryColor = isPositive ? 0x10b981 : 0xf43f5e // Emerald vs Rose
    const secondaryColor = isPositive ? 0x06b6d4 : 0xfbbf24 // Cyan vs Amber
    const neutralRingColor = 0x27272a // Zinc 800

    // 4. Main Particle Core Sphere (Procedural Fibonacci Sphere)
    const particleCount = 650
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const colorA = new THREE.Color(primaryColor)
    const colorB = new THREE.Color(secondaryColor)

    const goldenRatio = (1 + Math.sqrt(5)) / 2
    for (let i = 0; i < particleCount; i++) {
      const theta = 2 * Math.PI * i / goldenRatio
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount)
      const radius = 1.6 + (Math.sin(i * 0.2) * 0.08)

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const mixedColor = colorA.clone().lerp(colorB, Math.random() * 0.4)
      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })

    const particleGlobe = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleGlobe)

    // 5. Geodesic Wireframe Lattice Inner Sphere
    const innerGeo = new THREE.IcosahedronGeometry(1.58, 2)
    const innerMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    scene.add(innerMesh)

    // 6. Orbital Liquidity Rings (Equatorial & Polar)
    const ringGroup = new THREE.Group()

    const createRing = (radius: number, tiltX: number, tiltY: number, color: number, opacity: number) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0)
      const points = curve.getPoints(80)
      const ringGeo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, p.y, 0)))
      const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
      const ringMesh = new THREE.Line(ringGeo, ringMat)
      ringMesh.rotation.x = tiltX
      ringMesh.rotation.y = tiltY
      return ringMesh
    }

    const ring1 = createRing(2.1, Math.PI / 3, 0, primaryColor, 0.4)
    const ring2 = createRing(2.35, -Math.PI / 4, Math.PI / 6, secondaryColor, 0.3)
    const ring3 = createRing(2.6, Math.PI / 2.2, -Math.PI / 8, neutralRingColor, 0.5)

    ringGroup.add(ring1)
    ringGroup.add(ring2)
    ringGroup.add(ring3)
    scene.add(ringGroup)

    // 7. Interactive Mouse Coordinates & Damping
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }

    container.addEventListener('mousemove', handleMouseMove)

    // 8. Animation Loop
    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Damped mouse follow
      targetX += (mouseX * 0.6 - targetX) * 0.05
      targetY += (mouseY * 0.6 - targetY) * 0.05

      // Constant fluid kinetic rotation
      particleGlobe.rotation.y = elapsedTime * 0.15 + targetX
      particleGlobe.rotation.x = targetY * 0.5

      innerMesh.rotation.y = -elapsedTime * 0.08 + targetX * 0.5
      innerMesh.rotation.z = elapsedTime * 0.05

      ring1.rotation.z = elapsedTime * 0.2
      ring2.rotation.z = -elapsedTime * 0.15
      ring3.rotation.z = elapsedTime * 0.1

      // Subtle breathing pulse based on P&L
      const scalePulse = 1 + Math.sin(elapsedTime * 1.5) * 0.015
      particleGlobe.scale.set(scalePulse, scalePulse, scalePulse)

      renderer.render(scene, camera)
    }

    animate()

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return
      const newW = container.clientWidth
      const newH = container.clientHeight
      camera.aspect = newW / newH
      camera.updateProjectionMatrix()
      renderer.setSize(newW, newH)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      innerGeo.dispose()
      innerMat.dispose()
    }
  }, [isPositive])

  return (
    <div
      className="relative w-full h-full min-h-[260px] flex items-center justify-center overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Foreground Holographic Telemetry Badges */}
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/80 border border-white/[0.08] text-[10px] font-mono font-bold text-zinc-300 backdrop-blur-md shadow-sm">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>3D RISK ORB • VIZ-PRO</span>
        </span>
      </div>

      <div className="absolute top-3 right-3 pointer-events-none">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border backdrop-blur-md ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {isPositive ? 'HARMONIC EQUILIBRIUM' : 'DEFENSIVE POSTURE'}
        </span>
      </div>

      {/* Floating Center Metrics Readout */}
      <motion.div
        animate={{ opacity: isHovered ? 0.95 : 0.8, scale: isHovered ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="absolute bottom-3 inset-x-3 pointer-events-none p-2.5 rounded-xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-md flex items-center justify-between text-xs font-mono"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] text-zinc-400">Total Simulation Capital</span>
        </div>
        <div className="font-bold text-zinc-100 tabular-nums text-[11px]">
          ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      </motion.div>
    </div>
  )
}
