'use client';

import { useState } from 'react';
import * as motion from 'motion/react-client';
import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Loader2,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

type MessageLines = [string, string, string, string, string, string];


export default function ContactPostcard() {
	const [lines, setLines] = useState<MessageLines>(['', '', '', '', '', '']);
	const [to, setTo] = useState('');
	const [address1, setAddress1] = useState('');
	const [address2, setAddress2] = useState('');
	const [email, setEmail] = useState('');

	// Form state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSent, setIsSent] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	// Flip + image selection
	const postcardImages = [
		'/images/bavarian-tree.jpeg',
		'/images/hallstatt-1.jpeg',
		'/images/hallstatt-2.jpeg',
	];
	const [isFlipped, setIsFlipped] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>(
		'right'
	);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setErrorMessage('');

		const message = lines.filter(Boolean).join('\n');

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to,
					email,
					message,
					address1,
					address2,
					postcardImage: postcardImages[currentIndex],
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to send postcard');
			}

			// Trigger fly-away animation
			setIsSent(true);

			// Reset form after animation completes
			setTimeout(() => {
				setLines(['', '', '', '', '', '']);
				setTo('');
				setAddress1('');
				setAddress2('');
				setEmail('');
				setIsSent(false);
				setIsFlipped(false);
			}, 1500);
		} catch (err) {
			setErrorMessage(
				err instanceof Error ? err.message : 'Something went wrong'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetPostcard = () => {
		setIsSent(false);
		setLines(['', '', '', '', '', '']);
		setTo('');
		setAddress1('');
		setAddress2('');
		setEmail('');
		setIsFlipped(false);
	};

	return (
		<section id='contact' className='relative w-full min-h-screen bg-black text-white overflow-x-clip flex items-center'>
			<div className='mx-auto w-full max-w-6xl px-6 md:px-10 py-16 md:py-24 overflow-visible'>
				{/* Section heading */}
				<motion.div
					className='text-center mb-12'
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.5 }}
					transition={{ duration: 0.6, ease: 'easeOut' }}
				>
					<p className='text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-white/60 mb-3'>
						Contact
					</p>
					<h2 className='text-3xl md:text-5xl font-black tracking-tight text-white'>
						Send Yourself a Postcard
					</h2>
				</motion.div>

				{/* Postcard with 3D flip, maintains 3:2 aspect */}
				<motion.form
					onSubmit={submit}
					className='relative mx-auto w-full max-w-4xl overflow-visible'
					initial={{ opacity: 0, y: 60 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.3 }}
					transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
				>
					<AnimatePresence mode='wait'>
						{isSent ? (
							<motion.div
								key='sent-message'
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className='flex flex-col items-center justify-center py-32'
							>
								<p className='text-2xl font-bold text-white mb-4'>
									Postcard sent!
								</p>
								<p className='text-white/60 mb-8'>
									Check your inbox for your postcard.
								</p>
								<Button
									type='button'
									variant='outlineInverted'
									onClick={resetPostcard}
								>
									Send Another
								</Button>
							</motion.div>
						) : (
							<motion.div
								key='postcard'
								className='overflow-visible'
								initial={false}
								animate={
									isSent
										? {
												y: -800,
												rotate: -8,
												opacity: 0,
											}
										: {
												y: 0,
												rotate: 0,
												opacity: 1,
											}
								}
								transition={{
									type: 'spring',
									stiffness: 200,
									damping: 20,
									mass: 1,
								}}
							>
								<div
									className='relative mx-auto overflow-visible'
									style={{ perspective: 1200 }}
								>
									<div
										className='relative w-full overflow-visible'
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
											className='absolute inset-0 border border-black/20 bg-[#fffdf8] text-black'
											style={{
												boxShadow:
													'0 20px 60px rgba(0,0,0,0.25)',
												backfaceVisibility: 'hidden',
												WebkitBackfaceVisibility:
													'hidden',
												opacity: isFlipped ? 0 : 1,
												transition:
													'opacity 140ms linear',
												pointerEvents: isFlipped
													? 'none'
													: 'auto',
											}}
										>
											<div
												className='absolute inset-0 pointer-events-none'
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
														{lines.map(
															(value, idx) => (
																<div
																	key={idx}
																	className='relative'
																>
																	<input
																		value={
																			value
																		}
																		onChange={(
																			e
																		) => {
																			const next =
																				[
																					...lines,
																				] as MessageLines;
																			next[
																				idx
																			] =
																				e.target.value;
																			setLines(
																				next
																			);
																		}}
																		aria-label={`Line ${idx + 1}`}
																		placeholder={
																			idx ===
																			0
																				? 'Hello — I love your work…'
																				: ''
																		}
																		className='peer w-full bg-transparent outline-none text-[15px] md:text-[16px] leading-[36px] h-[36px] border-b border-black/30 focus:border-black placeholder:text-black/40'
																		autoComplete='off'
																	/>
																	<div className='pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-black/5' />
																</div>
															)
														)}
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
															setValue={
																setAddress1
															}
														/>
														<FieldLine
															label='City / ZIP'
															value={address2}
															setValue={
																setAddress2
															}
														/>
														<FieldLine
															label='Email'
															value={email}
															setValue={setEmail}
															type='email'
														/>
													</div>

													<div className='mt-8 flex flex-col items-end gap-2'>
														{errorMessage && (
															<p className='text-sm text-red-600'>
																{errorMessage}
															</p>
														)}
														<Button
															type='submit'
															variant='outline'
															className='gap-2'
															disabled={
																isSubmitting
															}
														>
															{isSubmitting ? (
																<>
																	Sending
																	<Loader2
																		size={
																			16
																		}
																		className='animate-spin'
																	/>
																</>
															) : (
																<>
																	Send
																	<ArrowUpRight
																		size={
																			16
																		}
																		className='-mt-[2px]'
																	/>
																</>
															)}
														</Button>
													</div>
												</div>
											</div>
										</div>

										{/* Back face: full-bleed image + picker */}
										<div
											className='absolute inset-0 bg-black overflow-visible'
											style={{
												transform: 'rotateY(180deg)',
												backfaceVisibility: 'hidden',
												WebkitBackfaceVisibility:
													'hidden',
												opacity: isFlipped ? 1 : 0,
												transition:
													'opacity 140ms linear',
												pointerEvents: isFlipped
													? 'auto'
													: 'none',
											}}
										>
											{/* Horizontal swipe carousel */}
											<AnimatePresence
												initial={false}
												mode='popLayout'
											>
												<motion.div
													key={currentIndex}
													initial={{
														x:
															swipeDirection ===
															'right'
																? '100vw'
																: '-100vw',
														rotate:
															swipeDirection ===
															'right'
																? 15
																: -15,
														scale: 0.85,
														opacity: 0,
													}}
													animate={{
														x: 0,
														rotate: 0,
														scale: 1,
														opacity: 1,
													}}
													exit={{
														x:
															swipeDirection ===
															'right'
																? '-100vw'
																: '100vw',
														rotate:
															swipeDirection ===
															'right'
																? -12
																: 12,
														scale: 0.85,
														opacity: 0,
													}}
													transition={{
														type: 'spring',
														stiffness: 120,
														damping: 20,
														mass: 1,
													}}
													className='absolute inset-0 p-5 md:p-7 bg-white border border-black/20'
													style={{
														boxShadow:
															'0 8px 32px rgba(0,0,0,0.15)',
													}}
												>
													<div className='relative w-full h-full'>
														<Image
															src={
																postcardImages[
																	currentIndex
																]
															}
															alt={`Postcard image ${currentIndex + 1}`}
															fill
															sizes='(max-width: 1024px) 100vw, 1024px'
															style={{
																objectFit:
																	'cover',
															}}
															priority
														/>
													</div>
												</motion.div>
											</AnimatePresence>
										</div>
									</div>
								</div>

								{/* External arrow controls - outside the card edges */}
								<div className='pointer-events-none'>
									<motion.button
										type='button'
										aria-label='Previous image'
										onClick={() => {
											setSwipeDirection('left');
											setCurrentIndex(
												(i) =>
													(i -
														1 +
														postcardImages.length) %
													postcardImages.length
											);
										}}
										initial={false}
										animate={
											isFlipped
												? { opacity: 1, x: 0, scale: 1 }
												: { opacity: 0, x: -10, scale: 0.9 }
										}
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.95 }}
										transition={{ duration: 0.2 }}
										className='pointer-events-auto absolute left-[-52px] top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 flex items-center justify-center rounded-full border-2 border-white/30 text-white bg-black/50 backdrop-blur-sm hover:bg-black/70 hover:border-white/50 transition-colors shadow-lg'
									>
										<ChevronLeft className='size-5 md:size-6' />
									</motion.button>
									<motion.button
										type='button'
										aria-label='Next image'
										onClick={() => {
											setSwipeDirection('right');
											setCurrentIndex(
												(i) =>
													(i + 1) %
													postcardImages.length
											);
										}}
										initial={false}
										animate={
											isFlipped
												? { opacity: 1, x: 0, scale: 1 }
												: { opacity: 0, x: 10, scale: 0.9 }
										}
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.95 }}
										transition={{ duration: 0.2 }}
										className='pointer-events-auto absolute right-[-52px] top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 flex items-center justify-center rounded-full border-2 border-white/30 text-white bg-black/50 backdrop-blur-sm hover:bg-black/70 hover:border-white/50 transition-colors shadow-lg'
									>
										<ChevronRight className='size-5 md:size-6' />
									</motion.button>
								</div>

								{/* Flip button - bottom center */}
								<div className='mt-6 flex justify-center'>
									<Button
										type='button'
										variant='outlineInverted'
										onClick={() => setIsFlipped((f) => !f)}
									>
										Flip Postcard
									</Button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.form>
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
