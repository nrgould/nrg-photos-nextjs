'use client';

import * as motion from 'motion/react-client';

const quote = '“The master of greens“';
const author = '— Rohan Ugale';

export default function QuoteSection() {
	// Preserve spaces as tokens so we don't collapse them when animating
	const tokens = quote.split(/(\s+)/);

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
		<section className='relative w-full bg-black text-white py-44 sm:py-56'>
			{/* Subtle vignette */}
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
