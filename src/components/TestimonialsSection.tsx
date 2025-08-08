import React from 'react';

type Testimonial = {
	quote: string;
	author: string;
	title?: string;
};

const testimonials: Testimonial[] = [
	{
		quote: 'Nicholas captured the essence of our brand launch. Every shot felt intentional and alive.',
		author: 'Avery Collins',
		title: 'Brand Manager, Lumen Co.',
	},
	{
		quote: 'The portraits were timeless. Our team felt at ease, and it absolutely shows in the results.',
		author: 'Jordan Reeves',
		title: 'Creative Director, North & Pine',
	},
	{
		quote: 'From planning to delivery, everything was seamless. The images elevated our whole campaign.',
		author: 'Morgan Lee',
		title: 'Marketing Lead, Arctis',
	},
	{
		quote: 'A perfect balance of artistry and professionalism. We can’t wait to collaborate again.',
		author: 'Riley Bennett',
		title: 'Founder, Atlas Studio',
	},
];

export default function TestimonialsSection() {
	const marqueeSpeedSeconds = 40;

	return (
		<section
			aria-labelledby='testimonials-heading'
			className='w-full bg-black text-white py-16 sm:py-20'
		>
			{/* Heading container */}
			<div className='px-6 sm:px-8 max-w-6xl mx-auto'>
				<div className='mb-8 sm:mb-10'>
					<h2
						id='testimonials-heading'
						className='text-3xl sm:text-4xl font-black tracking-tight'
					>
						Testimonials
					</h2>
				</div>
			</div>

			{/* Full-bleed marquee row */}
			<div className='relative overflow-hidden w-screen'>
				<div
					className='marquee-right flex gap-8 sm:gap-10 whitespace-nowrap will-change-transform'
					style={{
						['--marquee-speed' as any]: `${marqueeSpeedSeconds}s`,
					}}
				>
					{testimonials.map((item, index) => (
						<figure
							key={`row1-${index}-${item.author}`}
							className='inline-flex w-[72vw] sm:w-[560px] md:w-[700px] shrink-0 border border-white/15 bg-black shadow-md p-8 sm:p-10 rounded-none text-left'
						>
							<div>
								<blockquote className='text-xl sm:text-2xl font-black leading-tight tracking-tight break-words'>
									“{item.quote}”
								</blockquote>
								<figcaption className='mt-5 text-sm sm:text-base font-medium opacity-80'>
									{item.author}
									{item.title ? (
										<span className='font-normal opacity-70'>
											{' '}
											· {item.title}
										</span>
									) : null}
								</figcaption>
							</div>
						</figure>
					))}
					{/* Duplicate for seamless loop */}
					{testimonials.map((item, index) => (
						<figure
							key={`row2-${index}-${item.author}`}
							className='inline-flex w-[88vw] sm:w-[560px] md:w-[700px] shrink-0 border border-white/15 bg-black shadow-md p-8 sm:p-10 rounded-none text-left'
						>
							<div>
								<blockquote className='text-2xl sm:text-3xl font-black leading-tight tracking-tight break-words'>
									“{item.quote}”
								</blockquote>
								<figcaption className='mt-5 text-sm sm:text-base font-medium opacity-80'>
									{item.author}
									{item.title ? (
										<span className='font-normal opacity-70'>
											{' '}
											· {item.title}
										</span>
									) : null}
								</figcaption>
							</div>
						</figure>
					))}
				</div>
			</div>
		</section>
	);
}
