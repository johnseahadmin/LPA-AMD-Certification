// TODO: GET/POST session config
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "GET session config" });
}

export async function POST() {
  return NextResponse.json({ message: "POST session config" });
}
