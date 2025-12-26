import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Fetch all users from Clerk (excluding the current user)
    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({
      limit: 50,
    })

    const usersData = users
      .filter(user => user.id !== userId) // Exclude current user
      .map(user => {
        // Better name extraction logic
        let name = ''
        
        // Try firstName + lastName first
        if (user.firstName || user.lastName) {
          name = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        }
        
        // If no name from firstName/lastName, try username or email
        if (!name && user.username) {
          name = user.username
        }
        
        // If still no name, use email username part
        if (!name && user.emailAddresses?.[0]?.emailAddress) {
          name = user.emailAddresses[0].emailAddress.split('@')[0]
        }
        
        // Final fallback
        if (!name) {
          name = 'User'
        }

        // Check for custom uploaded image URL in metadata first, then fall back to Clerk's imageUrl
        let finalImageUrl = ''
        
        // First check public metadata for Supabase URL
        if (user.publicMetadata?.profileImageUrl) {
          finalImageUrl = user.publicMetadata.profileImageUrl as string
        } else if (user.publicMetadata?.avatarUrl) {
          finalImageUrl = user.publicMetadata.avatarUrl as string
        } else {
          // Fall back to Clerk's default imageUrl
          finalImageUrl = user.imageUrl || ''
        }

        const userData = {
          id: user.id,
          name: name,
          email: user.emailAddresses[0]?.emailAddress || '',
          imageUrl: finalImageUrl,
          hasImage: finalImageUrl.includes('supabase.co') || user.hasImage,
          isOnline: false, // Remove random online status - set to false for now
        }
        
        return userData
      })

    return NextResponse.json(usersData)
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}