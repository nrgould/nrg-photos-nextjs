'use client';

import { useState, useCallback } from 'react';
import * as motion from 'motion/react-client';
import { ArrowUpRight } from 'lucide-react';

export default function Hero() {
	const [mouse, setMouse] = useState({ x: 0, y: 0 });

	const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		setMouse({ x: e.clientX - cx, y: e.clientY - cy });
	}, []);

	const orb1 = {
		transform: `translate3d(${mouse.x * -0.02}px, ${
			mouse.y * -0.04
		}px, 0) scaleX(1.6) rotate(-8deg)`,
	} as React.CSSProperties;
	const orb2 = {
		transform: `translate3d(${mouse.x * 0.02}px, ${
			mouse.y * 0.03
		}px, 0) scaleX(1.4) rotate(12deg)`,
	} as React.CSSProperties;

	return (
		<section
			onMouseMove={onMove}
			className='relative isolate w-full min-h-[92vh] flex items-center justify-center bg-black text-white overflow-hidden'
		>
			{/* Background color + vignette */}
			<div className='absolute inset-0 -z-20 bg-black' />
			<div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_20%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,1)_100%)]' />

			{/* Glow orbs (blurred, screen blend) */}
			<motion.div
				aria-hidden
				className='absolute -top-40 -left-48 w-[85vw] h-[85vw] rounded-full blur-3xl mix-blend-screen'
				style={{
					...orb1,
					background:
						'radial-gradient(closest-side, rgba(255,159,64,0.38), rgba(255,159,64,0) 65%)',
				}}
			/>
			<motion.div
				aria-hidden
				className='absolute -bottom-40 -right-56 w-[90vw] h-[90vw] rounded-full blur-3xl mix-blend-screen'
				style={{
					...orb2,
					background:
						'radial-gradient(closest-side, rgba(255,111,0,0.32), rgba(255,111,0,0) 65%)',
				}}
			/>

			{/* Content */}
			<div className='relative z-10 mx-auto max-w-[1100px] px-6 text-center'>
				<h1 className='text-[42px] leading-[1.05] sm:text-[64px] md:text-[88px] font-black tracking-[-0.025em]'>
					Turn Your Vision Into an
					<br className='hidden sm:block' />
					Experience That Lasts
				</h1>
				<p className='mt-6 text-neutral-300 text-base sm:text-lg max-w-3xl mx-auto'>
					You have a story worth sharing — let&#39;s shape it with
					light, texture, and detail.
				</p>

				<div className='mt-10 flex items-center justify-center gap-4'>
					<a
						href='#contact'
						className='inline-flex items-center gap-2 border border-white/60 px-5 py-3 text-sm font-semibold tracking-wide uppercase hover:bg-white hover:text-black transition-colors'
					>
						Let&#39;s Talk{' '}
						<ArrowUpRight size={16} className='-mt-[2px]' />
					</a>
				</div>
			</div>
		</section>
	);
}
