import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import pusher from '@/lib/pusher'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('=== SEND MESSAGE API CALLED ===')
  
  try {
    console.log('1. Getting authenticated user...')
    const { userId } = await auth()
    
    if (!userId) {
      console.log('❌ No userId found in auth')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ User authenticated:', userId)

    console.log('2. Parsing request body...')
    const body = await request.json()
    const { content, receiverId, type = 'text' } = body
    console.log('✅ Request data:', { content: content?.substring(0, 20) + '...', receiverId, type })

    if (!content || !receiverId) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { content: !!content, receiverId: !!receiverId }
      }, { status: 400 })
    }

    console.log('3. Getting user details from Clerk...')
    let senderName = 'Anonymous'
    let senderImage = ''
    
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous'
      senderImage = user.imageUrl || ''
      console.log('✅ User details loaded:', senderName)
    } catch (userError) {
      console.log('⚠️ Could not load user details, using fallback')
    }

    console.log('4. Checking Pusher environment...')
    const envCheck = {
      appId: !!process.env.PUSHER_APP_ID,
      key: !!process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: !!process.env.PUSHER_SECRET,
      cluster: !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    }
    console.log('Environment check:', envCheck)
    
    if (!envCheck.appId || !envCheck.key || !envCheck.secret || !envCheck.cluster) {
      console.log('❌ Missing Pusher environment variables')
      return NextResponse.json({ 
        error: 'Server configuration incomplete',
        missing: Object.entries(envCheck).filter(([k, v]) => !v).map(([k]) => k)
      }, { status: 500 })
    }
    console.log('✅ All Pusher environment variables present')

    console.log('5. Ensuring users exist in database...')
    let senderDbUser, receiverDbUser
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      
      // Upsert sender user
      senderDbUser = await prisma.user.upsert({
        where: { clerkId: userId },
        create: {
          clerkId: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: senderImage
        },
        update: {
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: senderImage
        }
      })

      // Upsert receiver user (basic info, will be updated when they log in)
      receiverDbUser = await prisma.user.upsert({
        where: { clerkId: receiverId },
        create: {
          clerkId: receiverId,
          email: '', // Will be updated when they log in
          firstName: 'User',
          imageUrl: ''
        },
        update: {} // Don't overwrite existing data
      })
      console.log('✅ Users ensured in database')
    } catch (userError) {
      console.log('⚠️ User creation warning:', userError)
      // Continue anyway, the message might still work
      return NextResponse.json({ 
        error: 'Failed to create users in database',
        details: userError instanceof Error ? userError.message : 'User creation error'
      }, { status: 500 })
    }

    console.log('6. Preparing message data...')
    const channelName = `chat-${[userId, receiverId].sort().join('-')}`
    
    // Save message to database first
    console.log('7. Saving message to database...')
    let savedMessage
    try {
      savedMessage = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: senderDbUser.id,
          receiverId: receiverDbUser.id,
          type
        },
        include: {
          sender: true
        }
      })
      console.log('✅ Message saved to database with ID:', savedMessage.id)
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError)
      return NextResponse.json({ 
        error: 'Failed to save message to database',
        details: dbError instanceof Error ? dbError.message : 'Database error'
      }, { status: 500 })
    }

    const messageData = {
      id: savedMessage.id,
      content: savedMessage.content,
      senderId: savedMessage.sender.clerkId,
      receiverId: receiverId,
      type: savedMessage.type,
      timestamp: savedMessage.createdAt.toISOString(),
      status: 'sent',
      sender: {
        id: userId,
        name: senderName,
        imageUrl: senderImage
      }
    }
    
    console.log('✅ Message prepared for channel:', channelName)

    console.log('8. Broadcasting to Pusher...')
    try {
      await pusher.trigger(channelName, 'new-message', messageData)
      console.log('✅ Message broadcasted successfully!')
      
      // Send delivery confirmation after a short delay
      setTimeout(async () => {
        try {
          // Update message status in database
          await prisma.message.update({
            where: { id: savedMessage.id },
            data: { deliveredAt: new Date() }
          })
          
          // Broadcast status update via Pusher
          await pusher.trigger(channelName, 'message-status', {
            messageId: savedMessage.id,
            status: 'delivered'
          })
          console.log('✅ Delivery status updated in database and broadcasted')
        } catch (statusError) {
          console.log('⚠️ Failed to update delivery status:', statusError)
        }
      }, 1000)

      return NextResponse.json({
        success: true,
        message: messageData,
        channel: channelName
      })
      
    } catch (pusherError) {
      console.error('❌ Pusher error:', pusherError)
      return NextResponse.json({ 
        error: 'Failed to send message',
        details: pusherError instanceof Error ? pusherError.message : 'Pusher error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Unexpected error in send message API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}