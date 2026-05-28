import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
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
    },
  })

  if (!news) {
    notFound()
  }

  // Parse imagesUrls
  let images: string[] = []
  try {
    images = news.imagesUrls ? JSON.parse(news.imagesUrls) : []
  } catch (_) {
    // fallback
  }
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)

  return (
    <html lang="te">
      <head>
        <title>{news.title}</title>
        <meta name="description" content={news.shortDesc || ''} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-md w-full bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {/* Image Section */}
          {imageUrl && (
            <div className="relative w-full h-56 bg-gray-100">
              <img
                src={imageUrl}
                alt={news.title}
                className="w-full h-full object-cover"
              />
              {news.category && (
                <span className="absolute top-4 left-4 bg-[#D32F2F] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                  {news.category.name}
                </span>
              )}
            </div>
          )}

          {/* Content Section */}
          <div className="p-6 flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">
              {news.title}
            </h1>
            <p className="text-gray-700 leading-relaxed text-base mb-6 flex-1">
              {news.shortDesc}
            </p>

            {/* CTA Button */}
            <a
              href="https://play.google.com/store/apps/details?id=com.telanganajyothi.shorts"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold rounded-2xl text-center shadow-md shadow-red-200 transition-all block duration-200"
            >
              Download Telangana Jyothi App
            </a>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} Telangana Jyothi. All rights reserved.
        </p>
      </body>
    </html>
  )
}
