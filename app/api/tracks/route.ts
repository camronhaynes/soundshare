import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const currentUser = await getCurrentUser();

    let tracks;

    if (username) {
      // Get tracks for specific user (public profile)
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      tracks = await prisma.track.findMany({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (currentUser) {
      // Get current user's tracks
      tracks = await prisma.track.findMany({
        where: { userId: currentUser.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Get all public tracks for explore page
      tracks = await prisma.track.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to 50 most recent tracks
      });
    }

    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Get tracks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}

// Delete track
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('id');

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Check if track belongs to user
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    if (track.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete track from database
    await prisma.track.delete({
      where: { id: trackId }
    });

    // TODO: Delete file from disk

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete track error:', error);
    return NextResponse.json(
      { error: 'Failed to delete track' },
      { status: 500 }
    );
  }
}