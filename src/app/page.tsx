import Hero from '@/components/Hero';
import AboutSection from '@/components/AboutSection';
import ScrollGallery from '@/components/ScrollGallery';
import ContactPostcard from '@/components/ContactPostcard';
import TravelSection from '@/components/TravelSection';
import PolaroidStackSection from '@/components/PolaroidStackSection';
import QuoteSection from '@/components/QuoteSection';

export default function Home() {
	return (
		<div className='items-center min-h-screen'>
			<main className='flex flex-col row-start-2 items-center sm:items-start w-full'>
				{/* Hero */}
				<div className='w-full'>
					<Hero />
				</div>

				{/* About Section */}
				<div className='w-full'>
					<AboutSection />
				</div>

				{/* Portfolio Section */}
				<div className='w-full'>
					<ScrollGallery headingText='NRG' />
				</div>

				{/* Quote */}
				<div className='w-full'>
					<QuoteSection />
				</div>

				{/* Travel */}
				<div className='w-full'>
					<TravelSection />
				</div>

				{/* Polaroid Stack Section */}
				<div className='w-full'>
					<PolaroidStackSection />
				</div>

				{/* Contact Postcard */}
				<div className='w-full'>
					<ContactPostcard />
				</div>
			</main>
			<footer className='row-start-3 flex gap-[24px] flex-wrap items-center justify-center'></footer>
		</div>
	);
}
