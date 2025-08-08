'use client';

import Image from 'next/image';
import * as motion from 'motion/react-client';
import { useMemo } from 'react';

export type PolaroidProps = {
	src: string;
	caption: string;
	width?: number; // px
	// Horizontal placement relative to the parent (in px)
	x?: number;
	// How far above its resting place the card starts (in px, positive values mean it starts higher)
	startYOffset?: number;
	// Starting/ending rotation in degrees
	startRotationDeg?: number;
	endRotationDeg?: number;
	// Start larger and settle to 1.0, no bounce
	startScale?: number;
	// Global scroll progress [0..1] provided by parent
	progress?: number;
	// Stagger the start (0..1 puts the start later in the parent's progress)
	stagger?: number;
	// Optional className for the outer wrapper
	className?: string;
	// Optional alt text override
	alt?: string;
};

const clamp = (v: number, min: number, max: number) =>
	Math.min(Math.max(v, min), max);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Polaroid({
	src,
	caption,
	width = 220,
	x = 0,
	startYOffset = 240,
	startRotationDeg,
	endRotationDeg,
	startScale = 1.28,
	progress = 0,
	stagger = 0,
	className,
	alt,
}: PolaroidProps) {
	// Create deterministic random-ish defaults per src
	const [startRot, endRot] = useMemo(() => {
		const seed = [...src].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
		const base = ((seed % 26) - 13) * 1.2; // -15..15
		const delta = ((seed % 7) - 3) * 0.6; // -1.8..1.8
		return [startRotationDeg ?? base - 6, endRotationDeg ?? base + delta];
	}, [src, startRotationDeg, endRotationDeg]);

	const localT = clamp((progress - stagger) / (1 - stagger || 1), 0, 1);
	const eased = easeOutCubic(localT);

	const translateY = lerp(-startYOffset, 0, eased);
	const rotate = lerp(startRot, endRot, eased);
	const scale = lerp(startScale, 1, easeOutCubic(localT));
	const opacity = eased; // fade in as it falls

	return (
		<motion.div
			style={{
				width,
				transform: `translate3d(${x}px, ${translateY}px, 0) rotate(${rotate}deg) scale(${scale})`,
				opacity,
			}}
			className={`select-none pointer-events-auto will-change-transform drop-shadow-2xl ${
				className ?? ''
			}`}
		>
			<div
				className='bg-white p-2 pb-8 shadow-[0_12px_28px_rgba(0,0,0,0.35)]'
				style={{ width }}
			>
				<div
					className='relative overflow-hidden'
					style={{ width: '100%', aspectRatio: '5 / 5' }}
				>
					<Image
						src={src}
						alt={alt || caption}
						fill
						sizes='(max-width: 768px) 60vw, 220px'
						style={{ objectFit: 'cover' }}
					/>
				</div>
				<div className='mt-2 text-center'>
					<span className='text-[12px] tracking-wide text-neutral-800 font-medium'>
						{caption}
					</span>
				</div>
			</div>
		</motion.div>
	);
}
