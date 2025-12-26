import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

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

    const body = await request.text()
    const params = new URLSearchParams(body)
    const socketId = params.get('socket_id')
    const channelName = params.get('channel_name')

    if (!socketId || !channelName) {
      return new NextResponse('Missing parameters', { status: 400 })
    }

    // Authorize user for this channel
    // Channel name format: chat-{userId1}-{userId2}
    const channelParts = channelName.split('-')
    if (channelParts.length !== 3 || channelParts[0] !== 'chat') {
      return new NextResponse('Invalid channel', { status: 403 })
    }

    const [, userId1, userId2] = channelParts
    
    // Check if current user is part of this chat
    if (userId !== userId1 && userId !== userId2) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Generate auth signature
    const authResponse = pusher.authorizeChannel(socketId, channelName, {
      user_id: userId,
      user_info: {
        name: userId
      }
    })

    return NextResponse.json(authResponse)

  } catch (error) {
    console.error('Pusher auth error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}