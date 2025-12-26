import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Pusher from 'pusher'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { messageIds, senderId } = body

    if (!messageIds || !senderId) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Update messages as read
    await prisma.message.updateMany({
      where: {
        id: {
          in: messageIds
        },
        receiverId: userId // Only allow marking own received messages as read
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    // Generate channel name
    const channelName = `chat-${[userId, senderId].sort().join('-')}`

    // Broadcast read status via Pusher
    await pusher.trigger(channelName, 'messages-read', {
      messageIds,
      readBy: userId,
      readAt: new Date()
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Mark messages read error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}