'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Image from 'next/image';
// motion imported elsewhere in project; not needed here

type GalleryImage = { src: string; alt?: string };

export default function TravelSection() {
	const sectionRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [progress, setProgress] = useState(0); // 0..1 scroll progress through this section
	const progressRef = useRef(0);

	const images = useMemo<GalleryImage[]>(
		() => [
			{
				src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=900&fit=crop&auto=format&dpr=2',
				alt: 'Desert',
			},
			{
				src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=900&fit=crop&auto=format&dpr=2',
				alt: 'Forest',
			},
			{
				src: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1200&h=900&fit=crop&auto=format&dpr=2',
				alt: 'City',
			},
			{
				src: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&h=900&fit=crop&auto=format&dpr=2',
				alt: 'Mountains',
			},
			{
				src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=900&fit=crop&auto=format&dpr=2',
				alt: 'Water',
			},
		],
		[]
	);

	// Scroll progress mapping
	useEffect(() => {
		const onScroll = () => {
			const el = sectionRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const h = window.innerHeight;
			const start = h * 0.8;
			const end = -(rect.height - h * 0.2);
			const raw = (start - rect.top) / (start - end);
			const clamped = Math.min(Math.max(raw, 0), 1);
			setProgress(clamped);
			progressRef.current = clamped;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, []);

	// Three.js Globe init
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
		camera.position.set(0, 0, 7);

		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(2.4, 64, 64),
			new THREE.MeshStandardMaterial({
				color: 0x2a2a2a,
				metalness: 0.15,
				roughness: 0.9,
			})
		);
		scene.add(sphere);

		const wire = new THREE.LineSegments(
			new THREE.WireframeGeometry(new THREE.SphereGeometry(2.42, 24, 16)),
			new THREE.LineBasicMaterial({
				color: 0x4d4d4d,
				transparent: true,
				opacity: 0.35,
			})
		);
		scene.add(wire);

		const ambient = new THREE.AmbientLight(0xffffff, 0.35);
		scene.add(ambient);
		const light1 = new THREE.DirectionalLight(0xffffff, 1.25);
		light1.position.set(5, 4, 6);
		scene.add(light1);
		const light2 = new THREE.DirectionalLight(0xff6f00, 0.8);
		light2.position.set(-6, -3, -4);
		scene.add(light2);

		const resize = () => {
			const parent = canvas.parentElement as HTMLElement;
			if (!parent) return;
			const w = parent.clientWidth;
			const h = parent.clientHeight;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		resize();
		window.addEventListener('resize', resize);

		let rafId = 0 as number;
		const loop = () => {
			// Rotate the globe based on progress and time for subtle motion
			const baseRotation = performance.now() * 0.00007;
			const scrollTurn = progressRef.current * Math.PI * 2; // one full turn over the section
			sphere.rotation.y = baseRotation + scrollTurn;
			wire.rotation.y = sphere.rotation.y;
			renderer.render(scene, camera);
			rafId = requestAnimationFrame(loop);
		};
		rafId = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('resize', resize);
			renderer.dispose();
			sphere.geometry.dispose();
			(sphere.material as THREE.Material).dispose();
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			className='relative w-full bg-black text-white'
		>
			<div className='relative w-full h-[90vh] overflow-hidden'>
				{/* Globe background */}
				<div className='absolute inset-0 -z-10'>
					<canvas ref={canvasRef} className='w-full h-full' />
					{/* Soft vignette */}
					<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_10%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,1)_100%)]' />
				</div>

				{/* Heading */}
				<div className='absolute top-12 left-1/2 -translate-x-1/2 text-center'>
					<h3 className='text-[40px] sm:text-[56px] md:text-[72px] font-black tracking-[-0.02em] uppercase'>
						Travel With Me
					</h3>
				</div>

				{/* Rotating galleries */}
				<div className='absolute inset-0 flex flex-col items-center justify-center gap-6'>
					<MarqueeRow
						images={images}
						direction='left'
						progress={progress}
						heightClass='h-[22vh]'
					/>
					<MarqueeRow
						images={images}
						direction='right'
						progress={progress}
						heightClass='h-[22vh]'
					/>
				</div>
			</div>
		</section>
	);
}

function MarqueeRow({
	images,
	direction,
	progress = 0,
	heightClass = 'h-[26vh]',
}: {
	images: GalleryImage[];
	direction: 'left' | 'right';
	progress?: number;
	heightClass?: string;
}) {
	const row = [...images, ...images];
	const animClass = direction === 'left' ? 'marquee-left' : 'marquee-right';
	// Very slow baseline; gently speeds up
	const speedSeconds = Math.max(90, 160 - progress * 50);
	return (
		<div className={`relative w-full overflow-hidden ${heightClass}`}>
			<div
				className={`flex h-full gap-6 ${animClass}`}
				style={{
					['--marquee-speed' as unknown as string]: `${speedSeconds}s`,
				}}
			>
				{row.map((img, i) => (
					<div
						key={i}
						className='relative shrink-0 bg-neutral-900'
						style={{ height: '100%', aspectRatio: '4 / 5' }}
					>
						<Image
							src={img.src}
							alt={img.alt || 'gallery'}
							fill
							sizes='(max-width: 768px) 60vw, 420px'
							style={{ objectFit: 'cover' }}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
