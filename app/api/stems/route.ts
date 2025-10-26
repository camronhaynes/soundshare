import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const currentUser = await getCurrentUser();

    let stemGroups;

    if (username) {
      // Get stem groups for specific user (public profile)
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

      stemGroups = await prisma.stemGroup.findMany({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          },
          stems: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (currentUser) {
      // Get current user's stem groups
      stemGroups = await prisma.stemGroup.findMany({
        where: { userId: currentUser.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          },
          stems: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Get all public stem groups for explore page
      stemGroups = await prisma.stemGroup.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            }
          },
          stems: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20 // Limit to 20 most recent stem groups
      });
    }

    return NextResponse.json(stemGroups);
  } catch (error) {
    console.error('Get stem groups error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stem groups' },
      { status: 500 }
    );
  }
}

// Delete stem group
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
    const groupId = searchParams.get('id');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Check if stem group belongs to user
    const stemGroup = await prisma.stemGroup.findUnique({
      where: { id: groupId }
    });

    if (!stemGroup) {
      return NextResponse.json(
        { error: 'Stem group not found' },
        { status: 404 }
      );
    }

    if (stemGroup.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete stem group (cascade will delete stems)
    await prisma.stemGroup.delete({
      where: { id: groupId }
    });

    // TODO: Delete files from disk

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete stem group error:', error);
    return NextResponse.json(
      { error: 'Failed to delete stem group' },
      { status: 500 }
    );
  }
}