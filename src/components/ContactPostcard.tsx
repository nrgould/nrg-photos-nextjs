'use client';

import { useState } from 'react';
import * as motion from 'motion/react-client';
import { ArrowUpRight } from 'lucide-react';

type MessageLines = [string, string, string, string, string, string];

export default function ContactPostcard() {
	const [lines, setLines] = useState<MessageLines>(['', '', '', '', '', '']);
	const [to, setTo] = useState('');
	const [address1, setAddress1] = useState('');
	const [address2, setAddress2] = useState('');
	const [email, setEmail] = useState('');

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const message = lines.filter(Boolean).join('\n');
		// You can replace this with your API route
		console.log({ to, address1, address2, email, message });
		alert('Thanks — your postcard is ready to send!');
	};

	return (
		<section
			id='contact'
			className='relative w-full bg-[#f7f5ef] text-black'
		>
			{/* Perimeter border to feel like a card */}
			<div className='mx-auto w-full max-w-none border-y border-black/10'>
				<form onSubmit={submit} className='relative w-full'>
					{/* Postcard canvas */}
					<div className='mx-auto w-full px-6 md:px-10 py-16 md:py-24'>
						<div
							className='w-full border border-black/20 bg-[#fffdf8] text-black overflow-hidden'
							style={{
								boxShadow:
									'0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
								backgroundImage:
									'repeating-linear-gradient(0deg, rgba(0,0,0,0.04), rgba(0,0,0,0.04) 1px, transparent 1px, transparent 36px)',
							}}
						>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-0'>
								{/* Message side (left) */}
								<div className='relative p-6 md:p-10'>
									<h3 className='mb-6 text-xl md:text-2xl font-black tracking-tight'>
										Write a message
									</h3>
									<div className='space-y-3'>
										{lines.map((value, idx) => (
											<div key={idx} className='relative'>
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
												{/* Left margin indicator */}
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
										{/* Stamp */}
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
