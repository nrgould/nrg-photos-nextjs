'use client';

import { useState } from 'react';
import * as motion from 'motion/react-client';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import Image from 'next/image';

type MessageLines = [string, string, string, string, string, string];

export default function ContactPostcard() {
	const [lines, setLines] = useState<MessageLines>(['', '', '', '', '', '']);
	const [to, setTo] = useState('');
	const [address1, setAddress1] = useState('');
	const [address2, setAddress2] = useState('');
	const [email, setEmail] = useState('');

	// Flip + image selection
	const postcardImages = [
		'/images/bavarian-tree.jpeg',
		'/images/hallstatt-1.jpeg',
		'/images/hallstatt-2.jpeg',
	];
	const [isFlipped, setIsFlipped] = useState(false);
	const [selectedImage, setSelectedImage] = useState<string>(
		postcardImages[0]
	);
	const [prevImage, setPrevImage] = useState<string | null>(null);
	const [animKey, setAnimKey] = useState<number>(0);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const message = lines.filter(Boolean).join('\n');
		console.log({ to, address1, address2, email, message, selectedImage });
		alert('Thanks — your postcard is ready to send!');
	};

	return (
		<section
			id='contact'
			className='relative w-full bg-[#f7f5ef] text-black'
		>
			<div className='mx-auto w-full max-w-6xl px-6 md:px-10 py-16 md:py-24'>
				{/* Controls OUTSIDE the card */}
				<div className='mb-4 flex items-center justify-end gap-3'>
					<button
						type='button'
						onClick={() => setIsFlipped((f) => !f)}
						className='border border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-colors'
					>
						{isFlipped ? 'Show Front' : 'Flip Postcard'}
					</button>
				</div>

				{/* Postcard with 3D flip, maintains 3:2 aspect */}
				<form
					onSubmit={submit}
					className='relative mx-auto w-full max-w-4xl'
				>
					<div
						className='relative mx-auto'
						style={{ perspective: 1200 }}
					>
						<div
							className='relative w-full'
							style={{
								aspectRatio: '3 / 2',
								transformStyle: 'preserve-3d',
								WebkitTransformStyle: 'preserve-3d',
								transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
								transition:
									'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
							}}
						>
							{/* Front face: form */}
							<div
								className='absolute inset-0 border border-black/20 bg-[#fffdf8] text-black overflow-hidden'
								style={{
									boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
									backfaceVisibility: 'hidden',
									WebkitBackfaceVisibility: 'hidden',
									opacity: isFlipped ? 0 : 1,
									transition: 'opacity 140ms linear',
									pointerEvents: isFlipped ? 'none' : 'auto',
								}}
							>
								<div
									className='absolute inset-0'
									style={{
										backgroundImage:
											'repeating-linear-gradient(0deg, rgba(0,0,0,0.04), rgba(0,0,0,0.04) 1px, transparent 1px, transparent 36px)',
									}}
								/>

								<div className='relative grid grid-cols-1 md:grid-cols-2 h-full'>
									{/* Message side (left) */}
									<div className='relative p-6 md:p-10'>
										<h3 className='mb-6 text-xl md:text-2xl font-black tracking-tight'>
											Write a message
										</h3>
										<div className='space-y-3'>
											{lines.map((value, idx) => (
												<div
													key={idx}
													className='relative'
												>
													<input
														value={value}
														onChange={(e) => {
															const next = [
																...lines,
															] as MessageLines;
															next[idx] =
																e.target.value;
															setLines(next);
														}}
														aria-label={`Line ${
															idx + 1
														}`}
														placeholder={
															idx === 0
																? 'Hello — I love your work…'
																: ''
														}
														className='peer w-full bg-transparent outline-none text-[15px] md:text-[16px] leading-[36px] h-[36px] border-b border-black/30 focus:border-black placeholder:text-black/40'
														autoComplete='off'
													/>
													<div className='pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-black/5' />
												</div>
											))}
										</div>
									</div>

									{/* Address side (right) */}
									<div className='relative p-6 md:p-10 border-t md:border-t-0 md:border-l border-black/15'>
										<div className='flex items-start justify-between'>
											<h3 className='text-xl md:text-2xl font-black tracking-tight'>
												Address
											</h3>
											<motion.div
												initial={{
													rotate: -12,
													y: -6,
													opacity: 0,
												}}
												whileInView={{
													rotate: -8,
													y: 0,
													opacity: 1,
												}}
												viewport={{
													amount: 0.4,
													once: true,
												}}
												transition={{
													type: 'spring',
													stiffness: 160,
													damping: 18,
												}}
												className='select-none border-2 border-black/50 px-3 py-2 text-xs font-bold tracking-wider'
											>
												NRG PHOTO
											</motion.div>
										</div>

										<div className='mt-6 space-y-4'>
											<FieldLine
												label='To'
												value={to}
												setValue={setTo}
											/>
											<FieldLine
												label='Address'
												value={address1}
												setValue={setAddress1}
											/>
											<FieldLine
												label='City / ZIP'
												value={address2}
												setValue={setAddress2}
											/>
											<FieldLine
												label='Email'
												value={email}
												setValue={setEmail}
												type='email'
											/>
										</div>

										<div className='mt-8 flex justify-end'>
											<button
												type='submit'
												className='inline-flex items-center gap-2 border border-black px-4 py-2 font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-colors'
											>
												Send
												<ArrowUpRight
													size={16}
													className='-mt-[2px]'
												/>
											</button>
										</div>
									</div>
								</div>
							</div>

							{/* Back face: full-bleed image + picker */}
							<div
								className='absolute inset-0 border border-black/20 bg-white overflow-hidden'
								style={{
									transform: 'rotateY(180deg)',
									backfaceVisibility: 'hidden',
									WebkitBackfaceVisibility: 'hidden',
									boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
									opacity: isFlipped ? 1 : 0,
									transition: 'opacity 140ms linear',
									pointerEvents: isFlipped ? 'auto' : 'none',
								}}
							>
								{/* Thick white border via padding with animated image swap */}
								<div className='absolute inset-0 p-5 md:p-7'>
									<div className='relative w-full h-full bg-white overflow-hidden'>
										<AnimatePresence
											initial={false}
											mode='sync'
										>
											{prevImage &&
												prevImage !== selectedImage && (
													<motion.div
														key={`prev-${animKey}`}
														className='absolute inset-0'
														style={{
															zIndex: 1,
															willChange:
																'transform, opacity',
														}}
														initial={{
															scale: 1,
															y: 0,
															opacity: 1,
														}}
														animate={{
															scale: 0.92,
															y: -12,
															opacity: 0.5,
														}}
														exit={{
															scale: 0.9,
															y: -20,
															opacity: 0,
														}}
														transition={{
															duration: 0.9,
															ease: [
																0.16, 1, 0.3, 1,
															],
														}}
														onAnimationComplete={() =>
															setPrevImage(null)
														}
													>
														<Image
															src={prevImage}
															alt='Previous postcard image'
															fill
															sizes='(max-width: 1024px) 100vw, 1024px'
															style={{
																objectFit:
																	'cover',
															}}
															priority
														/>
													</motion.div>
												)}

											<motion.div
												key={`curr-${animKey}`}
												className='absolute inset-0'
												style={{
													zIndex: 2,
													willChange:
														'transform, opacity',
												}}
												initial={{
													scale: 1.08,
													y: 80,
													opacity: 0,
												}}
												animate={{
													scale: 1,
													y: 0,
													opacity: 1,
												}}
												exit={{}}
												transition={{
													duration: 0.95,
													ease: [0.16, 1, 0.3, 1],
												}}
											>
												<Image
													src={selectedImage}
													alt='Postcard back image'
													fill
													sizes='(max-width: 1024px) 100vw, 1024px'
													style={{
														objectFit: 'cover',
													}}
													priority
												/>
											</motion.div>
										</AnimatePresence>
									</div>
								</div>

								{/* (internal arrow controls removed; moved outside the card) */}
							</div>
						</div>
					</div>
					{/* External arrow controls - outside the card edges */}
					<div className='pointer-events-none'>
						<motion.button
							type='button'
							aria-label='Previous image'
							onClick={() => {
								const idx =
									postcardImages.indexOf(selectedImage);
								const prev =
									(idx - 1 + postcardImages.length) %
									postcardImages.length;
								setPrevImage(selectedImage);
								setSelectedImage(postcardImages[prev]);
								setAnimKey((k) => k + 1);
							}}
							initial={false}
							animate={
								isFlipped
									? { opacity: 1, x: 0 }
									: { opacity: 0, x: -10 }
							}
							transition={{ duration: 0.2 }}
							className='pointer-events-auto absolute left-[-46px] top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 border border-black text-black bg-white/90 hover:bg-white transition-colors shadow'
						>
							<ChevronLeft />
						</motion.button>
						<motion.button
							type='button'
							aria-label='Next image'
							onClick={() => {
								const idx =
									postcardImages.indexOf(selectedImage);
								const next = (idx + 1) % postcardImages.length;
								setPrevImage(selectedImage);
								setSelectedImage(postcardImages[next]);
								setAnimKey((k) => k + 1);
							}}
							initial={false}
							animate={
								isFlipped
									? { opacity: 1, x: 0 }
									: { opacity: 0, x: 10 }
							}
							transition={{ duration: 0.2 }}
							className='pointer-events-auto absolute right-[-46px] top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 border border-black text-black bg-white/90 hover:bg-white transition-colors shadow'
						>
							<ChevronRight />
						</motion.button>
					</div>
				</form>
			</div>
		</section>
	);
}

type FieldProps = {
	label: string;
	value: string;
	setValue: (v: string) => void;
	type?: string;
};

function FieldLine({ label, value, setValue, type = 'text' }: FieldProps) {
	return (
		<label className='block'>
			<div className='mb-1 text-xs font-semibold tracking-wide uppercase text-black/60'>
				{label}
			</div>
			<input
				type={type}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				className='w-full bg-transparent outline-none text-[15px] md:text-[16px] leading-[36px] h-[36px] border-b border-black/30 focus:border-black'
				autoComplete='off'
			/>
		</label>
	);
}
