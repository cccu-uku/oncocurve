import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scenario: string }> }
) {
  try {
    const { scenario } = await params;
    
    // Security: only allow alphanumeric filenames
    if (!/^[a-zA-Z0-9]+$/.test(scenario)) {
      return NextResponse.json(
        { error: 'Invalid scenario name' },
        { status: 400 }
      );
    }

    // Read the JSON file from public/mock-data
    const filePath = path.join(
      process.cwd(),
      'public/mock-data',
      `${scenario}.json`
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Mock data scenario not found: ${scenario}` },
        { status: 404 }
      );
    }

    // Read and return the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const patients = JSON.parse(fileContent);

    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error loading mock data:', error);
    return NextResponse.json(
      { error: 'Failed to load mock data' },
      { status: 500 }
    );
  }
}
