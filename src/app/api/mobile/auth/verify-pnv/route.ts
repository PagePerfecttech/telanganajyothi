import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import * as jose from "jose";

// The JWKS endpoint for Firebase Phone Number Verification
const JWKS_URL = "https://fpnv.googleapis.com/v1beta/jwks";

export async function POST(req: Request) {
  try {
    const { pnvToken } = await req.json();

    if (!pnvToken) {
      return NextResponse.json(
        { error: "Missing PNV token" },
        { status: 400 }
      );
    }

    // Parse the JWKS from Google
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));

    // Your Firebase Project details
    const projectId = "telangana-jyothi";
    const projectNumber = "323677252744";

    // Expected audiences (must contain one of these)
    const expectedAudiences = [
      `https://fpnv.googleapis.com/projects/${projectNumber}`,
      `https://fpnv.googleapis.com/projects/${projectId}`
    ];
    
    // Expected issuer
    const expectedIssuer = `https://fpnv.googleapis.com/projects/${projectNumber}`;

    // Verify the JWT signature and basic claims
    const { payload } = await jose.jwtVerify(pnvToken, JWKS, {
      issuer: expectedIssuer,
    });

    // Verify audience matches what we expect
    const aud = payload.aud;
    if (typeof aud === "string") {
      if (!expectedAudiences.includes(aud)) {
        throw new Error("Invalid token audience");
      }
    } else if (Array.isArray(aud)) {
      if (!aud.some(a => expectedAudiences.includes(a))) {
        throw new Error("Invalid token audience");
      }
    } else {
      throw new Error("Invalid token audience format");
    }

    // The verified phone number is stored in the token payload
    const phoneNumber = payload.phone_number;
    
    if (typeof phoneNumber !== "string") {
      throw new Error("Phone number not found in token payload");
    }

    // Mint a custom Firebase Auth token for this phone number.
    // 1. Get or create a Firebase User with this phone number.
    let uid;
    try {
      const userRecord = await auth.getUserByPhoneNumber(phoneNumber);
      uid = userRecord.uid;
    } catch (e: any) {
      // If user doesn't exist, create a new one
      if (e.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          phoneNumber: phoneNumber,
        });
        uid = newUser.uid;
      } else {
        throw e;
      }
    }

    // 2. Create the custom token
    const customToken = await auth.createCustomToken(uid);

    return NextResponse.json({ customToken, phoneNumber }, { status: 200 });
  } catch (error: any) {
    console.error("PNV verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify phone number" },
      { status: 401 }
    );
  }
}
