import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stemId: string }> }
) {
  try {
    const { stemId } = await params;

    // Get stem from database
    const stem = await prisma.stem.findUnique({
      where: { id: stemId }
    });

    if (!stem) {
      return NextResponse.json(
        { error: 'Stem not found' },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), stem.filePath);
    const file = await readFile(filePath);

    // Determine content type based on format
    const contentTypeMap: { [key: string]: string } = {
      'MP3': 'audio/mpeg',
      'WAV': 'audio/wav',
      'WEBM': 'audio/webm',
      'OGG': 'audio/ogg',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
    };

    const contentType = contentTypeMap[stem.format] || contentTypeMap[stem.format?.toLowerCase()] || 'audio/wav';

    // Return audio file with proper headers
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
      },
    });
  } catch (error) {
    console.error('Stream stem error:', error);
    return NextResponse.json(
      { error: 'Failed to stream stem file' },
      { status: 500 }
    );
  }
}