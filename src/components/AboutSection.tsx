'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as motion from 'motion/react-client';
import Polaroid from '@/components/Polaroid';

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export default function AboutSection() {
	const sectionRef = useRef<HTMLDivElement | null>(null);
	const [triggered, setTriggered] = useState(false);
	const [reveal, setReveal] = useState(0);

	// Trigger one-time animations when section enters viewport
	useEffect(() => {
		const el = sectionRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) setTriggered(true);
				});
			},
			{ threshold: 0.25 }
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	// Scroll-linked reveal for the heading (left-to-right)
	useEffect(() => {
		const onScroll = () => {
			const el = sectionRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const h = window.innerHeight;
			const start = h * 0.8;
			const end = -(rect.height - h * 0.2);
			const raw = (start - rect.top) / (start - end);
			setReveal(clamp(raw, 0, 1));
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
				x: -500,
				startYOffset: 220,
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
			className='relative w-full bg-black text-white min-h-[90vh] py-16 md:py-20'
		>
			<div className='mx-auto max-w-6xl px-6'>
				{/* 5 x 3 grid */}
				<div className='grid grid-cols-5 grid-rows-[auto_auto_auto] gap-6 md:gap-8 items-start'>
					{/* About heading: row1, cols 2-3 with scroll-linked reveal */}
					<div className='col-start-2 col-end-4 row-start-1 self-end justify-self-center w-full'>
						<div className='relative inline-block'>
							<h3 className='text-4xl md:text-6xl font-black tracking-[-0.02em] text-white/25 select-none'>
								About
							</h3>
							<h3
								className='absolute inset-0 text-4xl md:text-6xl font-black tracking-[-0.02em] text-white'
								style={{
									clipPath: `inset(0 ${Math.max(
										0,
										100 - reveal * 100
									)}% 0 0)`,
								}}
							>
								About
							</h3>
						</div>
					</div>

					{/* Image + Paragraph as one block in row2, cols 3-4 */}
					<div className='col-start-3 col-end-5 row-start-2 justify-self-start text-left flex flex-col items-start gap-4'>
						<div className='relative h-[92px] w-[92px] md:h-[110px] md:w-[110px]'>
							<Image
								src='https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=800&h=800&fit=crop&auto=format&dpr=2'
								alt='Profile portrait'
								fill
								sizes='(max-width: 768px) 92px, 110px'
								className='object-cover rounded-full'
								priority
							/>
						</div>
						<p className='text-neutral-300 text-[16px] md:text-[17px] leading-7 max-w-prose'>
							Photographer working at the edge of light and
							material. Reduced compositions, bold contrast, and a
							documentary approach to form. Based in SF, available
							worldwide.
						</p>
					</div>

					{/* Polaroid 1: column 1, center (row 2) */}
					<div className='col-start-1 col-end-2 row-start-2 self-center justify-self-center'>
						<motion.div
							initial={{ y: -240, scale: 1.1, opacity: 0 }}
							animate={
								triggered ? { y: 0, scale: 1, opacity: 1 } : {}
							}
							transition={{
								type: 'spring',
								stiffness: 220,
								damping: 16,
								mass: 0.7,
							}}
						>
							<Polaroid
								src={photos[0].src}
								caption={photos[0].caption}
								width={220}
								x={0}
								startYOffset={0}
								startRotationDeg={-10}
								endRotationDeg={-5}
								progress={1}
							/>
						</motion.div>
					</div>

					{/* Polaroid 2: column 5, top (row 1) */}
					<div className='col-start-5 col-end-6 row-start-1 self-start justify-self-center'>
						<motion.div
							initial={{ y: -260, scale: 1.1, opacity: 0 }}
							animate={
								triggered ? { y: 0, scale: 1, opacity: 1 } : {}
							}
							transition={{
								type: 'spring',
								stiffness: 220,
								damping: 16,
								mass: 0.7,
								delay: 0.1,
							}}
						>
							<Polaroid
								src={photos[1].src}
								caption={photos[1].caption}
								width={200}
								x={0}
								startYOffset={0}
								startRotationDeg={8}
								endRotationDeg={6}
								progress={1}
							/>
						</motion.div>
					</div>

					{/* Polaroid 3: spans columns 3-4, bottom (row 3) */}
					<div className='col-start-3 col-end-5 row-start-3 self-end justify-self-center'>
						<motion.div
							initial={{ y: -280, scale: 1.1, opacity: 0 }}
							animate={
								triggered ? { y: 0, scale: 1, opacity: 1 } : {}
							}
							transition={{
								type: 'spring',
								stiffness: 220,
								damping: 16,
								mass: 0.7,
								delay: 0.2,
							}}
						>
							<Polaroid
								src={photos[2].src}
								caption={photos[2].caption}
								width={280}
								x={0}
								startYOffset={0}
								startRotationDeg={-4}
								endRotationDeg={-2}
								progress={1}
							/>
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
