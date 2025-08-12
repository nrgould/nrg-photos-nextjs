'use client';

import { useEffect, useRef } from 'react';

type GreenGlobeProps = {
	className?: string;
};

export default function GreenGlobe({ className }: GreenGlobeProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const prevScrollYRef = useRef<number>(0);

	useEffect(() => {
		let world: any | null = null;
		let mounted = true;

		const GLOBE_IMG =
			'https://unpkg.com/three-globe/example/img/earth-dark.jpg';
		const COUNTRIES_GEOJSON =
			'https://unpkg.com/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson';

		const init = async () => {
			const mod = await import('globe.gl');
			if (!mounted) return;
			const Globe = mod.default as any;

			const el = containerRef.current;
			if (!el) return;

			world = Globe()(el)
				.globeImageUrl(GLOBE_IMG)
				.showAtmosphere(true)
				.atmosphereColor('#22c55e')
				.atmosphereAltitude(0.25)
				.showGraticules(false)
				.lineHoverPrecision(0);

			const controls = world.controls();
			controls.autoRotate = false;
			controls.enableZoom = false;

			const POV = { lat: 0, lng: 0, altitude: 2.2 };
			world.pointOfView(POV, 0);

			const resize = () => {
				if (!el || !world) return;
				const rect = el.getBoundingClientRect();
				world.width(rect.width).height(rect.height);
			};
			resize();
			window.addEventListener('resize', resize, { passive: true });

			fetch(COUNTRIES_GEOJSON)
				.then((r) => r.json())
				.then((geo) => {
					if (!world) return;
					const features = geo.features.filter(
						(f: any) => f.properties.ISO_A2 !== 'AQ'
					);
					world
						.polygonsData(features)
						.polygonAltitude(0.006)
						.polygonCapColor(() => 'rgba(0,0,0,0)')
						.polygonSideColor(() => 'rgba(0,0,0,0)')
						.polygonStrokeColor(() => '#22c55e');
				})
				.catch(() => {});

			const DEG_PER_PX = 0.07;
			prevScrollYRef.current = window.scrollY;

			const onScroll = () => {
				if (!world) return;
				const curr = window.scrollY;
				const deltaPx = curr - prevScrollYRef.current;
				prevScrollYRef.current = curr;
				POV.lng = normalizeLng(POV.lng - deltaPx * DEG_PER_PX);
				world.pointOfView(POV, 0);
			};
			window.addEventListener('scroll', onScroll, { passive: true });

			function normalizeLng(lng: number) {
				return ((((lng + 180) % 360) + 360) % 360) - 180;
			}

			return () => {
				window.removeEventListener('resize', resize);
				window.removeEventListener('scroll', onScroll);
			};
		};

		init();

		return () => {
			mounted = false;
			// Globe.js cleans up with GC when element is removed; clear children
			if (containerRef.current) {
				containerRef.current.innerHTML = '';
			}
			world = null;
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={`pointer-events-none ${className || ''}`}
		/>
	);
}
