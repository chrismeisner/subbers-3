// File: app/components/Hero.tsx

'use client'

import React from 'react'
import Link from 'next/link'

interface HeroProps {
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
}

export default function Hero({
  title = 'Welcome to Subbers-3',
  subtitle = 'Manage subscriptions and ticketed events in one simple dashboard.',
  ctaText = 'Get Started',
  ctaLink = '#',
}: HeroProps) {
  return (
	<section className="flex items-center justify-center h-screen bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center px-4">
	  <div className="max-w-xl">
		<h1 className="text-4xl md:text-6xl font-bold mb-4">{title}</h1>
		<p className="text-lg md:text-2xl mb-8">{subtitle}</p>
		<Link
		  href={ctaLink}
		  className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded hover:bg-gray-100 transition"
		>
		  {ctaText}
		</Link>
	  </div>
	</section>
  )
}
