// TODO: GET/PATCH room config
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "GET room config" });
}

export async function PATCH() {
  return NextResponse.json({ message: "PATCH room config" });
}
