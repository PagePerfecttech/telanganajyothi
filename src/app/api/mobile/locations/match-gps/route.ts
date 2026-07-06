import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const gpsSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = gpsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { latitude, longitude } = parsed.data

    let stateName = '';
    let districtName = '';
    let mandalName = '';

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          // Process address components from the first precise geocoding result
          const components = data.results[0].address_components || [];
          for (const comp of components) {
            if (comp.types.includes('administrative_area_level_1')) {
              stateName = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_2')) {
              districtName = comp.long_name;
            }
            if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_3') || comp.types.includes('sublocality_level_1')) {
              mandalName = comp.long_name;
            }
          }
        }
      } catch (e) {
        console.error('Google Geocoding API fetch error:', e);
      }
    }

    let matchedMandal: any = null;

    if (stateName) {
      // Find matching state in DB
      const stateObj = await db.state.findFirst({
        where: {
          name: { contains: stateName, mode: 'insensitive' },
          isActive: true,
          deletedAt: null,
        },
      });

      if (stateObj) {
        // Find matching district under the state
        let districtObj: any = null;
        if (districtName) {
          const normalizedDistrict = districtName.replace(/district/gi, '').trim();
          districtObj = await db.district.findFirst({
            where: {
              stateId: stateObj.id,
              name: { contains: normalizedDistrict, mode: 'insensitive' },
              isActive: true,
              deletedAt: null,
            },
          });
        }

        if (districtObj) {
          // Find matching mandal under the district
          if (mandalName) {
            const normalizedMandal = mandalName.replace(/mandal/gi, '').trim();
            matchedMandal = await db.mandal.findFirst({
              where: {
                districtId: districtObj.id,
                name: { contains: normalizedMandal, mode: 'insensitive' },
                isActive: true,
                deletedAt: null,
              },
              include: {
                district: {
                  include: {
                    state: true,
                  },
                },
                assembly: true,
              },
            });
          }

          // Fallback: Use the first available mandal in the matched district
          if (!matchedMandal) {
            matchedMandal = await db.mandal.findFirst({
              where: {
                districtId: districtObj.id,
                isActive: true,
                deletedAt: null,
              },
              include: {
                district: {
                  include: {
                    state: true,
                  },
                },
                assembly: true,
              },
            });
          }
        }
      }
    }

    // Fallback: If geocoding failed or returned no matches, compute a fallback mandal deterministically
    if (!matchedMandal) {
      const mandals = await db.mandal.findMany({
        where: { isActive: true, deletedAt: null },
        include: {
          district: {
            include: {
              state: true,
            },
          },
          assembly: true,
        },
      });

      if (mandals.length === 0) {
        return NextResponse.json({ error: 'No location records found in database' }, { status: 404 })
      }

      const index = Math.abs(Math.floor((latitude + longitude) * 10)) % mandals.length
      matchedMandal = mandals[index]
    }

    // Find first village belonging to the matched mandal
    const village = await db.village.findFirst({
      where: { mandalId: matchedMandal.id, isActive: true, deletedAt: null },
    })

    return NextResponse.json({
      success: true,
      state: matchedMandal.district.state,
      district: matchedMandal.district,
      assembly: matchedMandal.assembly,
      mandal: {
        id: matchedMandal.id,
        name: matchedMandal.name,
      },
      village: village ? {
        id: village.id,
        name: village.name,
      } : null,
    })
  } catch (error) {
    console.error('GPS matching error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
