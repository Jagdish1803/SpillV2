import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!otherUserId) {
      return new NextResponse('Missing userId parameter', { status: 400 })
    }

    // Get direct messages between the two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            sender: { clerkId: userId },
            receiver: { clerkId: otherUserId }
          },
          {
            sender: { clerkId: otherUserId },
            receiver: { clerkId: userId }
          }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            clerkId: true,
            firstName: true,
            lastName: true,
            imageUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Transform messages to match frontend format
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      senderId: message.sender.clerkId,
      receiverId: message.receiverId,
      timestamp: message.createdAt,
      type: message.type,
      status: message.readAt ? 'read' : message.deliveredAt ? 'delivered' : 'sent',
      sender: {
        id: message.sender.clerkId,
        name: `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() || 'User',
        imageUrl: message.sender.imageUrl
      }
    }))

    return NextResponse.json({ 
      messages: transformedMessages,
      hasMore: messages.length === limit
    })

  } catch (error) {
    console.error('Get messages error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}