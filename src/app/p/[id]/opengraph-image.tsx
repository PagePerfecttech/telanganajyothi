import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { safeJsonParse } from '@/lib/json-utils'

export const alt = 'News Card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

export default async function Image({ params }: { params: { id: string } }) {
  const resolvedParams = typeof (params as any).then === 'function' ? await (params as any) : params;
  const { id } = resolvedParams;

  const news = await db.news.findUnique({
    where: { id },
    include: { category: true, reporter: true }
  })

  if (!news) {
    return new ImageResponse(
      (
        <div style={{ fontSize: 48, background: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          News Not Found
        </div>
      ),
      { ...size }
    )
  }

  const images = safeJsonParse<string[]>(news.imagesUrls, [])
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spotnews.in'
  
  let finalImageUrl = imageUrl
  if (imageUrl && imageUrl.startsWith('/')) {
    finalImageUrl = `${baseUrl}${imageUrl}`
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Top Image Section (approx 60% of height) */}
        <div style={{ display: 'flex', width: '100%', height: '360px', position: 'relative' }}>
          {finalImageUrl ? (
            <img src={finalImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#e5e7eb' }} />
          )}

          {/* Reporter Badge */}
          <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '20px', 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            padding: '8px 16px', 
            borderRadius: '24px',
            display: 'flex'
          }}>
            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
              By {news.reporter?.name || 'Telangana Jyothi'}
            </span>
          </div>

          {/* Category Badge (Top Left) */}
          {news.category && (
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              left: '20px',
              backgroundColor: '#D32F2F',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {news.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Text Section */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '40px',
          height: '270px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '42px', 
              fontWeight: 'bold', 
              color: '#111111', 
              lineHeight: 1.2,
              maxHeight: '100px',
              overflow: 'hidden'
            }}>
              {news.title}
            </span>
            <span style={{ 
              fontSize: '28px', 
              color: '#555555', 
              marginTop: '16px',
              lineHeight: 1.4,
              maxHeight: '80px',
              overflow: 'hidden'
            }}>
              {news.shortDesc}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#D32F2F', fontSize: '24px', fontWeight: 'bold' }}>
              #STAY INFORMED, STAY UPDATED.
            </span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#111111', fontSize: '20px', fontWeight: 'bold' }}>
                Telangana Jyothi News
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
