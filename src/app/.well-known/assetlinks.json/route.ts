import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.telanganajyothi.shorts",
        sha256_cert_fingerprints: [
          // We will update this with the actual SHA-256 debug and release fingerprints
          "53:C7:0F:6B:A0:ED:A4:B0:29:CB:F2:A6:AF:34:4E:C5:86:E3:5C:E8", 
          "54:F1:C7:A9:E8:22:98:C1:2F:5C:D4:32:1A:BC:D5:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12"
        ]
      }
    }
  ]

  return NextResponse.json(assetlinks, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
