import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { safeJsonParse } from '@/lib/json-utils'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = typeof (params as any).then === 'function' 
    ? await (params as any) 
    : params;
  
  const { id } = resolvedParams
  const news = await db.news.findUnique({
    where: { id },
  })

  if (!news) {
    return {
      title: 'News Not Found',
    }
  }

  const images: string[] = safeJsonParse<string[]>(news.imagesUrls, [])
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://m.telanganajyothi.in' // Replace with your actual domain
  let finalImageUrl = imageUrl
  if (imageUrl && imageUrl.startsWith('/')) {
    finalImageUrl = `${baseUrl}${imageUrl}`
  }

  return {
    title: news.title,
    description: news.shortDesc || '',
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: news.title,
      description: news.shortDesc || '',
      type: 'article',
      siteName: 'Telangana Jyothi',
      ...(finalImageUrl ? { images: [finalImageUrl] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: news.title,
      description: news.shortDesc || '',
      ...(finalImageUrl ? { images: [finalImageUrl] } : {})
    }
  }
}

export default async function NewsPreviewPage({ params }: PageProps) {
  // Await params if it's a promise (Next.js 15 compatibility)
  const resolvedParams = typeof (params as any).then === 'function' 
    ? await (params as any) 
    : params;
  
  const { id } = resolvedParams

  const news = await db.news.findUnique({
    where: { id },
    include: {
      category: true,
      mandal: true,
      district: true,
    },
  })

  if (!news) {
    notFound()
  }

  // Parse imagesUrls safely
  const images: string[] = safeJsonParse<string[]>(news.imagesUrls, [])
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)
  const locationName = news.mandal?.name || news.district?.name || ''

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Image Section - aspect ratio 4/3 */}
        {imageUrl && (
          <div className="relative w-full aspect-[4/3] bg-gray-100">
            <img
              src={imageUrl}
              alt={news.title}
              className="w-full h-full object-cover rounded-b-xl"
            />
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Metadata Strip: card_strip, slogan, location */}
          <div className="mb-3 px-2 py-1.5 bg-[#F5F5F5] rounded-md flex justify-between items-center gap-2">
            <img
              src="/card_strip.jpeg"
              alt="Strip"
              className="h-6 object-contain"
            />
            
            {/* Slogan */}
            <div className="flex-1 text-center">
              <span className="text-[10px] font-extrabold text-[#E53935] tracking-tight whitespace-nowrap">
                #STAY INFORMED, STAY UPDATED.
              </span>
            </div>

            {/* Location */}
            {locationName && (
              <div className="flex items-center gap-0.5 text-[#666666] shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[11px] font-semibold">
                  {locationName}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">
            {news.title}
          </h1>
          <p className="text-gray-700 leading-relaxed text-sm mb-6 flex-1">
            {news.shortDesc}
          </p>

          {/* CTA Button */}
          <a
            href="https://play.google.com/store/apps/details?id=com.telanganajyothi.shorts"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold rounded-2xl text-center shadow-md shadow-red-200 transition-all block duration-200"
          >
            Download Telangana Jyothi App
          </a>
        </div>
      </div>
      <p className="text-gray-400 text-xs mt-6">
        © {new Date().getFullYear()} Telangana Jyothi. All rights reserved.
      </p>
    </div>
  )
}
