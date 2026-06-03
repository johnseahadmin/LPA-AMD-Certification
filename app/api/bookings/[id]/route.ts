// TODO: PATCH/DELETE booking
import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ message: "PATCH booking" });
}

export async function DELETE() {
  return NextResponse.json({ message: "DELETE booking" });
}
