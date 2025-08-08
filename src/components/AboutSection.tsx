'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import Polaroid from '@/components/Polaroid';

const clamp = (v: number, min: number, max: number) =>
	Math.min(Math.max(v, min), max);

export default function AboutSection() {
	const sectionRef = useRef<HTMLDivElement | null>(null);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const onScroll = () => {
			const el = sectionRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const h = window.innerHeight;
			// progress from when top hits 80% viewport to when bottom hits 20%
			const start = h * 0.8;
			const end = -(rect.height - h * 0.2);
			const raw = (start - rect.top) / (start - end);
			setProgress(clamp(raw, 0, 1));
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, []);

	const photos = useMemo(
		() => [
			{
				src: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Sunset walk',
				x: -280,
				startYOffset: 320,
				stagger: 0.0,
			},
			{
				src: 'https://images.unsplash.com/photo-1506086679524-493c64fdfaa6?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Studio light',
				x: 260,
				startYOffset: 260,
				stagger: 0.12,
			},
			{
				src: 'https://images.unsplash.com/photo-1503342217505-b0a15cf70489?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Quiet street',
				x: -120,
				startYOffset: 280,
				stagger: 0.22,
			},
			{
				src: 'https://images.unsplash.com/photo-1520975867597-0f56a9a69a6d?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Edges of light',
				x: 80,
				startYOffset: 340,
				stagger: 0.34,
			},
		],
		[]
	);

	return (
		<section
			ref={sectionRef}
			className='relative w-full h-[100vh] bg-black text-white'
		>
			<div className='mx-auto max-w-6xl px-6 py-24 md:py-40'>
				<div className='grid grid-cols-1 md:grid-cols-[420px,1fr] items-center gap-12 md:gap-16'>
					<div className='relative h-[200px] w-[200px] md:h-[200px] md:w-[200px]'>
						<Image
							src='https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=800&h=800&fit=crop&auto=format&dpr=2'
							alt='Profile portrait'
							fill
							sizes='(max-width: 768px) 160px, 200px'
							className='object-cover rounded-full'
							priority
						/>
					</div>
					<div>
						<h3 className='text-[44px] md:text-[64px] leading-none font-black tracking-[-0.02em] mb-6'>
							About
						</h3>
						<p className='text-neutral-300 text-[17px] md:text-[18px] leading-8 max-w-prose'>
							Photographer working at the edge of light and
							material. Reduced compositions, bold contrast, and a
							documentary approach to form. Based in SF, available
							worldwide.
						</p>
					</div>
				</div>
			</div>

			{/* Polaroids layer */}
			<div className='pointer-events-none absolute inset-0 overflow-visible'>
				<div className='relative h-full w-full'>
					{/* Center anchor roughly around portrait */}
					<div className='absolute left-1/2 top-[28%] -translate-x-1/2'>
						{photos.map((p, i) => (
							<Polaroid
								key={i}
								src={p.src}
								caption={p.caption}
								x={p.x}
								startYOffset={p.startYOffset}
								stagger={p.stagger}
								progress={progress}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
