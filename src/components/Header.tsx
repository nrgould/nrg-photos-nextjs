'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as motion from 'motion/react-client';

type HalationLinkProps = {
	href: string;
	children: React.ReactNode;
};

function HalationLink({ href, children }: HalationLinkProps) {
	const [hovered, setHovered] = useState(false);
	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className='relative inline-flex items-center justify-center px-3 py-1'
		>
			{/* Halation glow (stronger, layered) */}
			<motion.div
				aria-hidden
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{
					opacity: hovered ? 1 : 0,
					scale: hovered ? 1 : 0.95,
				}}
				transition={{ type: 'spring', stiffness: 200, damping: 20 }}
				className='pointer-events-none absolute inset-0'
				style={{
					filter: 'blur(18px)',
					background:
						'radial-gradient(45% 65% at 50% 50%, rgba(255,210,64,0.6), rgba(255,140,0,0.45) 40%, rgba(0,0,0,0) 72%)',
				}}
			/>
			<motion.div
				aria-hidden
				initial={{ opacity: 0 }}
				animate={{ opacity: hovered ? 0.8 : 0 }}
				transition={{ type: 'tween', duration: 0.2 }}
				className='pointer-events-none absolute inset-0'
				style={{
					filter: 'blur(32px)',
					background:
						'radial-gradient(60% 90% at 50% 50%, rgba(255,170,0,0.35), rgba(255,110,0,0.25) 45%, rgba(0,0,0,0) 80%)',
				}}
			/>
			<Link
				href={href}
				className='relative z-10 text-sm md:text-base tracking-wide'
			>
				{children}
			</Link>
		</div>
	);
}

export default function Header() {
	const [shopOpen, setShopOpen] = useState(false);
	return (
		<header className='sticky top-0 z-40 bg-transparent text-white'>
			<div className='w-full px-4 md:px-6'>
				<div className='grid grid-cols-[1fr_auto_1fr] h-14 md:h-16 items-center'>
					{/* Left brand */}
					<div className='justify-self-start text-xs md:text-sm font-semibold tracking-[0.2em]'>
						<Link href='/'>NICHOLAS GOULD</Link>
					</div>

					{/* Center nav */}
					<nav className='justify-self-center'>
						<ul className='flex items-center gap-3 md:gap-6'>
							<li>
								<HalationLink href='/'>Home</HalationLink>
							</li>
							<li>
								<HalationLink href='/projects'>
									Projects
								</HalationLink>
							</li>
							{/* Shop dropdown */}
							<li
								className='relative'
								onMouseEnter={() => setShopOpen(true)}
								onMouseLeave={() => setShopOpen(false)}
							>
								<HalationLink href='#'>Shop</HalationLink>
								{shopOpen && (
									<div className='absolute left-1/2 top-full mt-3 -translate-x-1/2 z-50'>
										<div className='min-w-[220px] bg-black/80 border border-white/10 p-3 text-sm shadow-2xl'>
											<div className='grid grid-cols-2 gap-2'>
												<Link
													href='/shop/prints'
													className='px-3 py-2 hover:underline'
												>
													Prints
												</Link>
												<Link
													href='/shop/presets'
													className='px-3 py-2 hover:underline'
												>
													Presets
												</Link>
											</div>
										</div>
									</div>
								)}
							</li>
							<li>
								<HalationLink href='/blog'>Blog</HalationLink>
							</li>
						</ul>
					</nav>

					{/* Right CTA */}
					<div className='justify-self-end'>
						<Link
							href='#contact'
							className='inline-flex items-center gap-2 border border-white/60 px-4 py-2 text-xs md:text-sm font-semibold tracking-wide uppercase hover:bg-white hover:text-black transition-colors'
						>
							Let&#39;s Talk
						</Link>
					</div>
				</div>
			</div>
		</header>
	);
}
