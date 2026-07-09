'use server';

import { supabase } from '@/lib/supabase';

export interface InstagramPost {
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
}

/**
 * Fetches recent media posts from the linked Instagram account.
 * Automatically falls back to high-fidelity mock posts if there is no linked account,
 * if the Meta API call fails, or if offline.
 */
export async function getInstagramPosts(): Promise<InstagramPost[]> {
  try {
    const { data: accounts, error } = await supabase
      .from('instagram_accounts')
      .select('*')
      .limit(1);

    if (error || !accounts || accounts.length === 0) {
      console.log('No Instagram account connected. Falling back to mock posts.');
      return getMockPosts();
    }

    const account = accounts[0];
    const { instagram_business_id, access_token } = account;

    if (!instagram_business_id || !access_token) {
      console.log('Account credentials missing. Falling back to mock posts.');
      return getMockPosts();
    }

    // Call the Meta Graph API to fetch posts
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${instagram_business_id}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${access_token}&limit=12`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Meta API returned error:', errData);
      return getMockPosts();
    }

    const data = await response.json();
    if (!data || !data.data || data.data.length === 0) {
      return getMockPosts();
    }

    return data.data;
  } catch (error) {
    console.error('Unexpected error fetching Instagram posts:', error);
    return getMockPosts();
  }
}

function getMockPosts(): InstagramPost[] {
  return [
    {
      id: "mock_post_1",
      caption: "Gitex Global Dubai 2026. Hall 2 (Za'abeel Plaza). Come visit us at the Dev Slam! 🚀",
      media_type: "IMAGE",
      media_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
      permalink: "https://instagram.com",
      timestamp: new Date().toISOString()
    },
    {
      id: "mock_post_2",
      caption: "Untitled Post",
      media_type: "IMAGE",
      media_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
      permalink: "https://instagram.com",
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "mock_post_3",
      caption: "Checking out the new GMC truck today. Styling is absolute fire!",
      media_type: "IMAGE",
      media_url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80",
      permalink: "https://instagram.com",
      timestamp: new Date(Date.now() - 172800000).toISOString()
    }
  ];
}
