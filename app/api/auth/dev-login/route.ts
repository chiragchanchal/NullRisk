import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase URL or Service Role Key is missing in environment variables' },
        { status: 500 }
      )
    }

    // Create admin client using the service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const defaultPassword = 'password123'

    // Try creating the user first
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true
    })

    if (createError) {
      // If user already exists, update their password and confirm their email
      if (createError.message?.toLowerCase().includes('already registered') || createError.status === 422) {
        // List users to find the correct user ID
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        })

        if (listError) {
          return NextResponse.json({ error: `Failed to find existing user: ${listError.message}` }, { status: 500 })
        }

        const user = usersData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        if (!user) {
          return NextResponse.json({ error: 'User not found in user list' }, { status: 404 })
        }

        // Update the existing user's password and set email_confirm to true
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: defaultPassword,
          email_confirm: true
        })

        if (updateError) {
          return NextResponse.json({ error: `Failed to update user password: ${updateError.message}` }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'User password updated and email confirmed successfully' })
      }

      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'User created and email confirmed successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
