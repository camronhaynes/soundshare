import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    // Get track from database
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), track.filePath);
    const file = await readFile(filePath);

    // Determine content type based on format
    const contentTypeMap: { [key: string]: string } = {
      'MP3': 'audio/mpeg',
      'WAV': 'audio/wav',
      'WEBM': 'audio/webm',
      'OGG': 'audio/ogg',
    };

    const contentType = contentTypeMap[track.format] || 'audio/mpeg';

    // Return audio file with proper headers
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json(
      { error: 'Failed to stream file' },
      { status: 500 }
    );
  }
}