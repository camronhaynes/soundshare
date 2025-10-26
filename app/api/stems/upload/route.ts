import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const groupTitle = (formData as any).get('title') as string;
    const description = (formData as any).get('description') as string;

    // Get the three stem files
    const drums = (formData as any).get('drums') as File | null;
    const bass = (formData as any).get('bass') as File | null;
    const melody = (formData as any).get('melody') as File | null;

    if (!groupTitle) {
      return NextResponse.json(
        { error: 'Group title is required' },
        { status: 400 }
      );
    }

    const stems = [
      { file: drums, type: 'drums', title: 'Drums', order: 0 },
      { file: bass, type: 'bass', title: 'Bass', order: 1 },
      { file: melody, type: 'melody', title: 'Melody', order: 2 }
    ].filter(s => s.file !== null);

    if (stems.length === 0) {
      return NextResponse.json(
        { error: 'At least one stem file is required' },
        { status: 400 }
      );
    }

    // Validate file types
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3'];
    for (const stem of stems) {
      if (stem.file && !validTypes.includes(stem.file.type)) {
        return NextResponse.json(
          { error: `Invalid file type for ${stem.type}. Please upload audio files.` },
          { status: 400 }
        );
      }
    }

    // Create stem group in database
    const stemGroup = await prisma.stemGroup.create({
      data: {
        userId: user.id,
        title: groupTitle,
        description: description || null,
      }
    });

    // Create user upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', user.id, 'stems', stemGroup.id);
    await mkdir(uploadDir, { recursive: true });

    // Process and save each stem
    const savedStems = [];
    for (const stem of stems) {
      if (!stem.file) continue;

      // Generate unique filename
      const fileExtension = stem.file.name.split('.').pop() || 'mp3';
      const uniqueFilename = `${stem.type}_${randomUUID()}.${fileExtension}`;

      // Save file to disk
      const filePath = path.join(uploadDir, uniqueFilename);
      const bytes = await stem.file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create stem record in database
      const savedStem = await prisma.stem.create({
        data: {
          stemGroupId: stemGroup.id,
          stemType: stem.type,
          title: stem.title,
          filename: stem.file.name,
          filePath: `/uploads/${user.id}/stems/${stemGroup.id}/${uniqueFilename}`,
          duration: 0, // TODO: Extract from audio metadata
          fileSize: stem.file.size,
          format: fileExtension.toUpperCase(),
          order: stem.order
        }
      });

      savedStems.push(savedStem);
    }

    // Return the created stem group with its stems
    const completeGroup = await prisma.stemGroup.findUnique({
      where: { id: stemGroup.id },
      include: {
        stems: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      stemGroup: completeGroup,
      success: true
    });
  } catch (error) {
    console.error('Stem upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload stems' },
      { status: 500 }
    );
  }
}