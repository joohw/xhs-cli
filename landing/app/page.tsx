import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import Demo from '@/components/Demo'
import FAQ from '@/components/FAQ'
import Guides from '@/components/Guides'
import CTA from '@/components/CTA'
import Footer from '@/components/Footer'
import StructuredData from '@/components/StructuredData'
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  GITHUB_URL,
  NPM_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_URL,
} from '@/lib/site'

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    url: SITE_URL,
  },
}

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'zh-CN',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      image: SOCIAL_IMAGE_URL,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Windows, Linux',
      isAccessibleForFree: true,
      downloadUrl: NPM_URL,
      codeRepository: GITHUB_URL,
      license: `${GITHUB_URL}/blob/main/LICENSE`,
      author: {
        '@type': 'Person',
        name: AUTHOR_NAME,
        url: AUTHOR_URL,
      },
      offers: {
        '@type': 'Offer',
        price: 0,
        priceCurrency: 'CNY',
      },
    },
  ],
}

export default function Home() {
  return (
    <div className="bg-slate-950 min-h-screen">
      <StructuredData data={homeJsonLd} />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Demo />
        <FAQ />
        <Guides />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
