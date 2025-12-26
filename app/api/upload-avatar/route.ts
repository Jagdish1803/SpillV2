import { createClient } from '@supabase/supabase-js'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new NextResponse('Invalid file type. Please upload an image.', { status: 400 })
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return new NextResponse('File too large. Please upload an image smaller than 5MB.', { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(fileBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return new NextResponse('Failed to upload image', { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    console.log('Generated public URL:', publicUrl)

    // Update Clerk user profile
    try {
      const client = await clerkClient()
      const updateResult = await client.users.updateUser(userId, {
        publicMetadata: {
          profileImageUrl: publicUrl
        }
      })
      
      console.log('Clerk update result - imageUrl:', updateResult.imageUrl)
      console.log('Clerk update result - publicMetadata:', updateResult.publicMetadata)
      console.log('Clerk update successful')
    } catch (clerkError) {
      console.error('Clerk update error:', clerkError)
      // Try alternative method with metadata
      try {
        const client = await clerkClient()
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            profileImageUrl: publicUrl,
            avatarUrl: publicUrl
          }
        })
        console.log('Clerk metadata update successful')
      } catch (metadataError) {
        console.error('Clerk metadata update error:', metadataError)
      }
    }

    return NextResponse.json({ 
      message: 'Profile picture updated successfully',
      imageUrl: publicUrl,
      note: 'Profile updated in Clerk - may take a moment to reflect in user list'
    })

  } catch (error) {
    console.error('Profile picture upload error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}