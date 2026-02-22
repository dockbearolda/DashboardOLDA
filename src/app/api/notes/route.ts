import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PEOPLE = ["loic", "charlie", "melina", "amandine"];

// GET /api/notes — return all 4 person notes (create rows if they don't exist)
export async function GET() {
  try {
    for (const person of PEOPLE) {
      await prisma.$executeRaw`
        INSERT INTO person_notes (id, person, content, todos, "updatedAt")
        VALUES (${`note_${person}`}, ${person}, '', '[]'::jsonb, NOW())
        ON CONFLICT (person) DO NOTHING
      `;
    }

    const notes = await prisma.$queryRaw<
      { person: string; content: string; todos: unknown; updatedAt: Date }[]
    >`
      SELECT person, content, todos, "updatedAt"
      FROM person_notes
      ORDER BY person
    `;

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
