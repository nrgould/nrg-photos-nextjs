'use client';

import Image from 'next/image';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import * as motion from 'motion/react-client';

type GalleryImage = {
	src: string;
	title: string;
	alt?: string;
};

type ScrollGalleryProps = {
	headingText?: string;
	images?: GalleryImage[];
};

// Utility: clamp number between min and max
const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export default function ScrollGallery({
	headingText = 'Portfolio',
	images,
}: ScrollGalleryProps) {
	const defaultImages: GalleryImage[] = useMemo(
		() => [
			{
				src: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=1200&h=1500&fit=crop&auto=format&dpr=2',
				title: 'Neon',
				alt: 'Neon portrait',
			},
			{
				src: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1200&h=1500&fit=crop&auto=format&dpr=2',
				title: 'Studio',
				alt: 'Studio fashion',
			},
			{
				src: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=1200&h=1500&fit=crop&auto=format&dpr=2',
				title: 'Street',
				alt: 'Street shot',
			},
			{
				src: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1200&h=1500&fit=crop&auto=format&dpr=2',
				title: 'Editorial',
				alt: 'Editorial portrait',
			},
			{
				src: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=1200&h=1500&fit=crop&auto=format&dpr=2',
				title: 'Monochrome',
				alt: 'Black and white',
			},
		],
		[]
	);

	const items = images && images.length > 0 ? images : defaultImages;

	const sectionRef = useRef<HTMLDivElement | null>(null);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [x, setX] = useState(0);
	const [leadingGap, setLeadingGap] = useState(0);

	const [trackScrollDistance, setTrackScrollDistance] = useState(0);
	const [sectionHeight, setSectionHeight] = useState(0);

	// Measure track and compute how far we need to translate horizontally
	const measure = useCallback(() => {
		const track = trackRef.current;
		if (!track) return;
		const viewportWidth = window.innerWidth;

		// Ensure first item starts off-screen to the right with a leading spacer
		const spacer = Math.max(0, Math.floor(viewportWidth * 0.62));
		setLeadingGap(spacer);

		// Include spacer and trailing right padding in distance
		const trailing = Math.floor(viewportWidth * 0.08);
		const trackWidth = track.scrollWidth + spacer + trailing;
		const distance = Math.max(0, trackWidth - viewportWidth);
		setTrackScrollDistance(distance);

		// Set a generous section height so that scrolling from start to end maps to full horizontal distance
		const heightNeeded = window.innerHeight + distance; // keeps sticky area pinned for entire translation
		setSectionHeight(heightNeeded);
	}, []);

	useLayoutEffect(() => {
		measure();
		const onResize = () => measure();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, [measure]);

	// Link vertical scroll progress to horizontal translation
	useEffect(() => {
		const onScroll = () => {
			const el = sectionRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const viewport = window.innerHeight;
			const totalScrollable = Math.max(1, sectionHeight - viewport);
			const progressed = clamp(-rect.top, 0, totalScrollable);
			const v = progressed / totalScrollable;
			const targetX = -v * trackScrollDistance;
			setX(targetX);
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [sectionHeight, trackScrollDistance]);

	return (
		<section
			ref={sectionRef}
			className='relative w-full'
			style={{ height: sectionHeight || undefined }}
		>
			{/* Sticky viewport */}
			<div className='sticky top-0 h-screen overflow-hidden bg-[rgb(12,12,12)] text-white'>
				{/* Background heading text */}
				<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
					<h2
						className='select-none text-[18vw] sm:text-[14vw] leading-none font-black tracking-tight text-white/5'
						aria-hidden
					>
						{headingText}
					</h2>
				</div>

				{/* Horizontal track */}
				<motion.div
					ref={trackRef}
					style={{
						transform: `translate3d(${x}px, 0, 0)`,
						paddingLeft: leadingGap,
						paddingRight: '8vw',
					}}
					className='absolute left-0 top-0 h-full flex items-center gap-8 will-change-transform'
				>
					{items.map((img, index) => (
						<Slide key={index} index={index} {...img} />
					))}
				</motion.div>
			</div>
		</section>
	);
}

function Slide({ src, title, alt, index }: GalleryImage & { index: number }) {
	const cardRef = useRef<HTMLDivElement | null>(null);
	const [active, setActive] = useState(false);

	// Horizontal center activation to avoid flicker on sticky sections
	useEffect(() => {
		const onScroll = () => {
			const el = cardRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const centerX = window.innerWidth / 2;
			const cardCenterX = rect.left + rect.width / 2;
			const distance = Math.abs(cardCenterX - centerX);
			const threshold = rect.width * 0.25; // within 25% of card width
			setActive(distance < threshold);
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, []);

	return (
		<div className='relative shrink-0'>
			<div
				ref={cardRef}
				className='relative overflow-hidden bg-neutral-900'
				style={{ width: 'min(52vw, 560px)', aspectRatio: '4 / 5' }}
			>
				<Image
					src={src}
					alt={alt || title}
					fill
					sizes='(max-width: 768px) 70vw, 520px'
					style={{ objectFit: 'cover' }}
					priority={index < 2}
				/>

				{/* Title pop-up when centered */}
				<div
					style={{
						opacity: active ? 1 : 0,
						transform: `scale(${active ? 1 : 0.96})`,
						transition: 'opacity 240ms ease, transform 240ms ease',
					}}
					className='absolute inset-0 flex items-center justify-center'
				>
					<span className='px-4 py-2 text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-black/50 text-white backdrop-blur'>
						{title}
					</span>
				</div>
			</div>
		</div>
	);
}
