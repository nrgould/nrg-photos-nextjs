'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as motion from 'motion/react-client';
import Polaroid from '@/components/Polaroid';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type StackImage = { src: string; caption: string };

export default function PolaroidStackSection() {
	const images = useMemo<StackImage[]>(
		() => [
			{
				src: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Neon',
			},
			{
				src: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Studio',
			},
			{
				src: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Street',
			},
			{
				src: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Editorial',
			},
			{
				src: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=1000&h=1250&fit=crop&auto=format&dpr=2',
				caption: 'Mono',
			},
		],
		[]
	);

	const [expanded, setExpanded] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	return (
		<section className='relative w-full bg-black text-white py-24 md:py-32'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='mb-8 flex items-center justify-between'>
					<h3 className='text-[32px] md:text-[48px] font-black tracking-[-0.02em]'>
						Selected Prints
					</h3>
					<button
						onClick={() => setExpanded((e) => !e)}
						className='border border-white px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-white hover:text-black transition-colors'
					>
						{expanded ? 'Collapse' : 'Expand'}
					</button>
				</div>

				{/* Stack / Row container */}
				<div
					className='relative h-[64vh] md:h-[56vh] w-full'
					onClick={() => !expanded && setExpanded(true)}
				>
					{images.map((img, i) => (
						<PolaroidCard
							key={i}
							i={i}
							total={images.length}
							expanded={expanded}
							src={img.src}
							caption={img.caption}
							onOpen={() => setLightboxIndex(i)}
						/>
					))}
				</div>

				{lightboxIndex !== null && (
					<Lightbox
						images={images}
						index={lightboxIndex}
						onClose={() => setLightboxIndex(null)}
						onNext={() =>
							setLightboxIndex((i) => (i! + 1) % images.length)
						}
						onPrev={() =>
							setLightboxIndex(
								(i) => (i! - 1 + images.length) % images.length
							)
						}
					/>
				)}
			</div>
		</section>
	);
}

function PolaroidCard({
	i,
	total,
	expanded,
	src,
	caption,
	onOpen,
}: {
	i: number;
	total: number;
	expanded: boolean;
	src: string;
	caption: string;
	onOpen: () => void;
}) {
	// Stack layout values
	const baseRotations = [-10, 6, -3, 12, -7];
	const rotation = baseRotations[i % baseRotations.length];
	const offsetX = (i - (total - 1) / 2) * 14; // small horizontal jitter for stack
	const offsetY = i * 2; // tiny stagger

	// Row layout values
	const rowGap = 18; // px gap between cards in row
	const rowX = (i - (total - 1) / 2) * (220 + rowGap);

	return (
		<motion.div
			onClick={(e) => {
				if (expanded) {
					e.stopPropagation();
					onOpen();
				}
			}}
			whileHover={{
				y: -8,
				rotate: rotation + (expanded ? 0 : 2),
				scale: 1.02,
			}}
			transition={{ type: 'spring', stiffness: 240, damping: 20 }}
			className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer'
			animate={
				expanded
					? { x: rowX, y: 0, rotate: 0, zIndex: 10 + i }
					: {
							x: offsetX,
							y: offsetY,
							rotate: rotation,
							zIndex: 10 + i,
					  }
			}
			style={{ willChange: 'transform' }}
		>
			<Polaroid
				src={src}
				caption={caption}
				width={220}
				x={0}
				startYOffset={0}
				startScale={1}
				startRotationDeg={rotation}
				endRotationDeg={rotation}
				progress={1}
			/>
		</motion.div>
	);
}

function Lightbox({
	images,
	index,
	onClose,
	onNext,
	onPrev,
}: {
	images: StackImage[];
	index: number;
	onClose: () => void;
	onNext: () => void;
	onPrev: () => void;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [containerW, setContainerW] = useState(1200);
	const [slideWidth, setSlideWidth] = useState(700);
	const GAP_PX = 40;
	const EXTRA_POLAROID_HEIGHT = 120; // approx padding + caption height

	useEffect(() => {
		const measure = () => {
			const w = containerRef.current?.clientWidth ?? window.innerWidth;
			const h =
				containerRef.current?.clientHeight ??
				Math.floor(window.innerHeight * 0.8);
			setContainerW(w);
			const maxByWidth = Math.min(Math.floor(w * 0.8), 900);
			const maxByHeight = Math.floor(
				((h - EXTRA_POLAROID_HEIGHT) * 3) / 4
			);
			const target = Math.max(220, Math.min(maxByWidth, maxByHeight));
			setSlideWidth(target);
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, []);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowRight') onNext();
			if (e.key === 'ArrowLeft') onPrev();
		};
		window.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [onClose, onNext, onPrev]);

	const img = images[index];

	return (
		<div className='fixed inset-0 z-[9999] bg-black/80 text-white pointer-events-auto'>
			<div className='absolute inset-0 z-[9998]' onClick={onClose} />
			<button
				aria-label='Close'
				className='absolute top-5 right-5 z-[10001] p-2 border border-white/40 hover:bg-white hover:text-black transition-colors'
				onClick={onClose}
			>
				<X size={18} />
			</button>

			{/* Navigation */}
			<button
				aria-label='Previous'
				className='absolute left-4 top-1/2 -translate-y-1/2 z-[10001] p-3 border border-white/40 hover:bg-white hover:text-black transition-colors'
				onClick={onPrev}
			>
				<ChevronLeft />
			</button>
			<button
				aria-label='Next'
				className='absolute right-4 top-1/2 -translate-y-1/2 z-[10001] p-3 border border-white/40 hover:bg-white hover:text-black transition-colors'
				onClick={onNext}
			>
				<ChevronRight />
			</button>

			<div className='absolute inset-0 z-[10000] flex items-center justify-center px-6 pointer-events-none'>
				<div
					ref={containerRef}
					className='relative w-full max-w-[1200px] h-[80vh] md:h-[76vh] pointer-events-auto overflow-visible py-4'
				>
					{/* Sliding track */}
					<div
						className='absolute top-1/2 flex items-center'
						style={{
							gap: GAP_PX,
							left: 0,
							transform: `translate3d(${
								containerW / 2 -
								slideWidth / 2 -
								index * (slideWidth + GAP_PX)
							}px, -50%, 0)`,
							transition:
								'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
						}}
					>
						{images.map((s, i) => (
							<motion.div
								key={i}
								className='shrink-0'
								style={{ width: slideWidth }}
								animate={
									i === index
										? { scale: 1, opacity: 1, zIndex: 3 }
										: {
												scale: 0.88,
												opacity: 0.7,
												zIndex: 1,
										  }
								}
								transition={{
									type: 'spring',
									stiffness: 360,
									damping: 24,
								}}
							>
								<Polaroid
									src={s.src}
									caption={s.caption}
									width={slideWidth}
									x={0}
									startYOffset={0}
									startScale={1}
									startRotationDeg={0}
									endRotationDeg={0}
									progress={1}
								/>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
