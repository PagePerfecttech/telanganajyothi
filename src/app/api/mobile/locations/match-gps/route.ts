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
          for (const result of data.results) {
            const components = result.address_components || [];
            for (const comp of components) {
              if (comp.types.includes('administrative_area_level_1') && !stateName) {
                stateName = comp.long_name;
              }
              if (comp.types.includes('administrative_area_level_2') && !districtName) {
                districtName = comp.long_name;
              }
              if ((comp.types.includes('locality') || comp.types.includes('administrative_area_level_3') || comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) && !mandalName) {
                mandalName = comp.long_name;
              }
            }
          }
        }
      } catch (e) {
        console.error('Google Geocoding API fetch error:', e);
      }
    }

    let matchedMandal: any = null;

    const normalizedDistrict = districtName.replace(/district/gi, '').trim();
    const normalizedMandal = mandalName.replace(/mandal/gi, '').trim();
    const normalizedState = stateName.replace(/state/gi, '').trim();

    // 1. Try matching District first by name (e.g. Visakhapatnam)
    if (normalizedDistrict) {
      const districtObj = await db.district.findFirst({
        where: {
          name: { contains: normalizedDistrict, mode: 'insensitive' },
          isActive: true,
          deletedAt: null,
        },
        include: { state: true },
      });

      if (districtObj) {
        // Try finding specific mandal under matched district
        if (normalizedMandal) {
          matchedMandal = await db.mandal.findFirst({
            where: {
              districtId: districtObj.id,
              name: { contains: normalizedMandal, mode: 'insensitive' },
              isActive: true,
              deletedAt: null,
            },
            include: {
              district: { include: { state: true } },
              assembly: true,
            },
          });
        }

        // Fallback within the same matched district
        if (!matchedMandal) {
          matchedMandal = await db.mandal.findFirst({
            where: {
              districtId: districtObj.id,
              isActive: true,
              deletedAt: null,
            },
            include: {
              district: { include: { state: true } },
              assembly: true,
            },
          });
        }
      }
    }

    // 2. Try matching Mandal directly by name if not yet matched
    if (!matchedMandal && normalizedMandal) {
      matchedMandal = await db.mandal.findFirst({
        where: {
          name: { contains: normalizedMandal, mode: 'insensitive' },
          isActive: true,
          deletedAt: null,
        },
        include: {
          district: { include: { state: true } },
          assembly: true,
        },
      });
    }

    // 3. Try matching State if still not matched
    if (!matchedMandal && normalizedState) {
      const stateObj = await db.state.findFirst({
        where: {
          OR: [
            { name: { contains: normalizedState, mode: 'insensitive' } },
            { code: { equals: normalizedState, mode: 'insensitive' } },
          ],
          isActive: true,
          deletedAt: null,
        },
      });

      if (stateObj) {
        matchedMandal = await db.mandal.findFirst({
          where: {
            district: { stateId: stateObj.id },
            isActive: true,
            deletedAt: null,
          },
          include: {
            district: { include: { state: true } },
            assembly: true,
          },
        });
      }
    }

    // 4. Ultimate fallback: First active mandal in DB (or matching active state)
    if (!matchedMandal) {
      matchedMandal = await db.mandal.findFirst({
        where: { isActive: true, deletedAt: null },
        include: {
          district: { include: { state: true } },
          assembly: true,
        },
      });
    }

    if (!matchedMandal) {
      return NextResponse.json({ error: 'No location records found in database' }, { status: 404 });
    }

    // Find first village belonging to the matched mandal
    const village = await db.village.findFirst({
      where: { mandalId: matchedMandal.id, isActive: true, deletedAt: null },
    });

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
