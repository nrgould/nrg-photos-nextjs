'use client';

import * as motion from 'motion/react-client';
import { useCallback, useState } from 'react';

const quote = '“The master of greens“';
const author = '— Rohan Ugale';

export default function QuoteSection() {
	// Preserve spaces as tokens so we don't collapse them when animating
	const tokens = quote.split(/(\s+)/);

	// Subtle mouse-parallax for green orbs (hero-like background)
	const [mouse, setMouse] = useState({ x: 0, y: 0 });
	const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		setMouse({ x: e.clientX - cx, y: e.clientY - cy });
	}, []);

	const orb1 = {
		transform: `translate3d(${mouse.x * -0.015}px, ${
			mouse.y * -0.03
		}px, 0) scaleX(1.5) rotate(-10deg)`,
		background:
			'radial-gradient(closest-side, rgba(16,185,129,0.35), rgba(16,185,129,0) 65%)', // emerald-ish
	} as React.CSSProperties;
	const orb2 = {
		transform: `translate3d(${mouse.x * 0.018}px, ${
			mouse.y * 0.022
		}px, 0) scaleX(1.35) rotate(14deg)`,
		background:
			'radial-gradient(closest-side, rgba(34,197,94,0.28), rgba(34,197,94,0) 65%)', // green-ish
	} as React.CSSProperties;

	const container = {
		hidden: {},
		show: {
			transition: {
				staggerChildren: 0.06,
				delayChildren: 0.1,
			},
		},
	} as const;

	const child = {
		hidden: { y: '100%', opacity: 0 },
		show: {
			y: '0%',
			opacity: 1,
			transition: {
				type: 'spring',
				stiffness: 500,
				damping: 30,
				mass: 0.6,
			},
		},
	} as const;

	return (
		<section
			onMouseMove={onMove}
			className='relative isolate w-full text-white py-44 sm:py-56 overflow-hidden'
		>
			{/* Base */}
			<div className='absolute inset-0 -z-20 bg-black' />
			{/* Glow orbs (blurred, green, screen blend) */}
			<motion.div
				aria-hidden
				className='absolute -top-40 -left-48 w-[85vw] h-[85vw] rounded-full blur-3xl mix-blend-screen z-0'
				style={orb1}
			/>
			<motion.div
				aria-hidden
				className='absolute -bottom-40 -right-56 w-[90vw] h-[90vw] rounded-full blur-3xl mix-blend-screen z-0'
				style={orb2}
			/>
			{/* Vignette overlay */}
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_10%,rgba(0,0,0,0.6)_70%,rgba(0,0,0,1)_100%)]' />

			<div className='relative mx-auto max-w-5xl px-6 text-center'>
				<motion.div
					className='overflow-hidden inline-block align-top'
					initial='hidden'
					whileInView='show'
					viewport={{ amount: 0.5, once: true }}
					variants={container}
				>
					<h2 className='m-0 leading-[1.08] font-black tracking-[-0.025em] text-[44px] sm:text-[68px] md:text-[92px]'>
						{tokens.map((t, i) => {
							const isSpace = /\s+/.test(t);
							if (isSpace) return <span key={i}>{'\u00A0'}</span>;
							const word = t.replace(/[“”]/g, '');
							const isGreenWord = word.toLowerCase() === 'greens';
							return (
								<span
									key={i}
									className='inline-block overflow-hidden align-top pb-[0.08em]'
								>
									<motion.span
										className={
											isGreenWord
												? 'inline-block text-[#0e9b6e]'
												: 'inline-block'
										}
										variants={child}
									>
										{t}
									</motion.span>
								</span>
							);
						})}
					</h2>
				</motion.div>

				<motion.p
					initial={{ y: 18, opacity: 0 }}
					whileInView={{ y: 0, opacity: 1 }}
					viewport={{ amount: 0.6, once: true }}
					transition={{ type: 'spring', stiffness: 300, damping: 28 }}
					className='mt-6 text-xl sm:text-2xl font-semibold tracking-wide text-white/80'
				>
					{author}
				</motion.p>

				{/* underline accent animates in */}
				<motion.div
					initial={{ scaleX: 0, opacity: 0 }}
					whileInView={{ scaleX: 1, opacity: 1 }}
					viewport={{ amount: 0.7, once: true }}
					transition={{
						type: 'spring',
						stiffness: 220,
						damping: 24,
						delay: 0.15,
					}}
					className='mx-auto mt-8 h-[2px] w-[180px] bg-white/70 origin-left'
				/>
			</div>
		</section>
	);
}
