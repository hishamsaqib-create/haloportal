'use client'

import { useEffect, useRef, useState } from 'react'
import type { WebGLRenderer, Mesh, MeshPhongMaterial } from 'three'

interface STLViewerProps {
  url: string
  fileName?: string
  className?: string
}

export function STLViewer({ url, fileName, className = '' }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<{ mesh: Mesh; material: MeshPhongMaterial } | null>(null)
  const glRendererRef = useRef<WebGLRenderer | null>(null)
  const animationRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wireframe, setWireframe] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    let mounted = true

    const initViewer = async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')

        if (!mounted || !containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight

        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f7)

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
        camera.position.set(0, 0, 100)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        container.appendChild(renderer.domElement)
        glRendererRef.current = renderer

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.enableZoom = true
        controls.enablePan = true

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(50, 50, 50)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
        backLight.position.set(-50, -50, -50)
        scene.add(backLight)

        // Grid
        const gridHelper = new THREE.GridHelper(200, 20, 0xd1d5db, 0xe5e7eb)
        gridHelper.rotation.x = Math.PI / 2
        scene.add(gridHelper)

        // Load STL
        const loader = new STLLoader()
        loader.load(
          url,
          (geometry) => {
            if (!mounted) return

            geometry.computeVertexNormals()
            geometry.center()

            const material = new THREE.MeshPhongMaterial({
              color: 0xe8e0d8,
              specular: 0x333333,
              shininess: 40,
              wireframe: false,
            })

            const mesh = new THREE.Mesh(geometry, material)
            mesh.castShadow = true
            mesh.receiveShadow = true

            // Auto-scale to fit view
            const bbox = new THREE.Box3().setFromObject(mesh)
            const size = bbox.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)
            const scale = 60 / maxDim
            mesh.scale.set(scale, scale, scale)

            scene.add(mesh)

            // Position camera
            camera.position.set(0, -40, 60)
            camera.lookAt(0, 0, 0)
            controls.target.set(0, 0, 0)
            controls.update()

            rendererRef.current = { mesh, material }
            if (mounted) setLoading(false)
          },
          undefined,
          (err) => {
            console.error('STL load error:', err)
            if (mounted) {
              setError('Failed to load STL file')
              setLoading(false)
            }
          }
        )

        // Animation loop
        const animate = () => {
          if (!mounted) return
          animationRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Resize handler
        const handleResize = () => {
          if (!container) return
          const w = container.clientWidth
          const h = container.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
        }
      } catch (err) {
        console.error('Three.js init error:', err)
        if (mounted) {
          setError('Failed to initialise 3D viewer')
          setLoading(false)
        }
      }
    }

    initViewer()

    return () => {
      mounted = false
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      const renderer = glRendererRef.current
      if (renderer) {
        renderer.dispose()
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement)
        }
      }
    }
  }, [url])

  // Toggle wireframe
  useEffect(() => {
    if (rendererRef.current?.material) {
      rendererRef.current.material.wireframe = wireframe
    }
  }, [wireframe])

  return (
    <div className={`relative rounded-xl border border-gray-200 bg-gray-100 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {fileName && (
          <span className="rounded-lg bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm border border-gray-200">
            {fileName}
          </span>
        )}
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm border transition-colors ${
            wireframe ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/90 backdrop-blur text-gray-700 border-gray-200 hover:bg-white'
          }`}
        >
          Wireframe
        </button>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-10">
        <span className="rounded-lg bg-white/80 backdrop-blur px-2.5 py-1 text-[10px] text-gray-500 shadow-sm border border-gray-200">
          Drag to rotate &middot; Scroll to zoom &middot; Right-click to pan
        </span>
      </div>

      {/* Loading */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
          <div className="text-center">
            <svg className="h-8 w-8 animate-spin text-gray-400 mx-auto" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Loading 3D model...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
          <div className="text-center">
            <svg className="h-8 w-8 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  )
}
