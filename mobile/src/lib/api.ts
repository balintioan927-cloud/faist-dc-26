import type { ImagePickerAsset } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export type Visibility = 'public' | 'followers' | 'private';

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_path: string | null;
};

export type FeedPost = {
  id: string;
  author_id: string;
  body: string;
  image_path: string | null;
  visibility: Visibility;
  created_at: string;
  author: Pick<Profile, 'id' | 'username' | 'full_name'>;
  image_url: string | null;
  liked_by_me: boolean;
  likes_count: number;
  is_following_author: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

export type Conversation = {
  id: string;
  other_user_id: string;
  other_username: string;
  other_name: string;
  last_message: string;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function client() {
  if (!supabase) {
    throw new Error('Configurează mobile/.env cu URL-ul și cheia publicabilă Supabase.');
  }
  return supabase;
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < 12) return 'Parola trebuie să aibă cel puțin 12 caractere.';
  if (!/[a-z]/.test(password)) return 'Adaugă cel puțin o literă mică.';
  if (!/[A-Z]/.test(password)) return 'Adaugă cel puțin o literă mare.';
  if (!/[0-9]/.test(password)) return 'Adaugă cel puțin o cifră.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Adaugă cel puțin un simbol.';
  return null;
}

export function validateUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,30}$/.test(username);
}

export async function signUp(
  email: string,
  password: string,
  username: string,
  fullName: string,
) {
  const passwordProblem = validateStrongPassword(password);
  if (passwordProblem) throw new Error(passwordProblem);

  const normalizedUsername = username.trim().toLowerCase();
  if (!validateUsername(normalizedUsername)) {
    throw new Error('Username-ul trebuie să aibă 3–30 caractere: litere mici, cifre, punct, cratimă sau underscore.');
  }

  const normalizedFullName = fullName.trim();
  if (!normalizedFullName) throw new Error('Numele complet este obligatoriu.');

  return client().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        username: normalizedUsername,
        full_name: normalizedFullName.slice(0, 80),
      },
    },
  });
}

export async function signIn(email: string, password: string) {
  return client().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signOut() {
  return client().auth.signOut();
}

export async function getMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await client()
    .from('profiles')
    .select('id, username, full_name, bio, avatar_path')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateMyProfile(
  userId: string,
  fullName: string,
  bio: string,
) {
  if (!fullName.trim()) throw new Error('Numele complet nu poate fi gol.');
  const { error } = await client()
    .from('profiles')
    .update({
      full_name: fullName.trim().slice(0, 80),
      bio: bio.trim().slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchFeed(userId: string): Promise<FeedPost[]> {
  const c = client();
  const { data: rows, error } = await c
    .from('posts')
    .select('id, author_id, body, image_path, visibility, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.author_id))];

  const [
    { data: profiles, error: profileError },
    { data: likes, error: likesError },
    { data: follows, error: followsError },
  ] = await Promise.all([
    c.from('profiles').select('id, username, full_name').in('id', authorIds),
    c.from('post_likes').select('post_id, user_id').in('post_id', ids),
    c.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds),
  ]);
  if (profileError) throw profileError;
  if (likesError) throw likesError;
  if (followsError) throw followsError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const followingIds = new Set((follows ?? []).map((row) => row.following_id));
  const result: FeedPost[] = [];

  for (const row of rows) {
    const profile = profileMap.get(row.author_id);
    let imageUrl: string | null = null;
    if (row.image_path) {
      const { data: signed, error: signedError } = await c.storage
        .from('faist-photos')
        .createSignedUrl(row.image_path, 60 * 60);
      if (!signedError) imageUrl = signed?.signedUrl ?? null;
    }
    const postLikes = (likes ?? []).filter((like) => like.post_id === row.id);
    result.push({
      ...(row as Omit<FeedPost, 'author' | 'image_url' | 'liked_by_me' | 'likes_count'>),
      author: {
        id: row.author_id,
        username: profile?.username ?? 'utilizator',
        full_name: profile?.full_name ?? 'Utilizator FAIST',
      },
      image_url: imageUrl,
      liked_by_me: postLikes.some((like) => like.user_id === userId),
      likes_count: postLikes.length,
      is_following_author: followingIds.has(row.author_id),
    });
  }
  return result;
}

export async function createPost(
  userId: string,
  body: string,
  visibility: Visibility,
  asset: ImagePickerAsset | null,
) {
  const c = client();
  if (!body.trim() && !asset) {
    throw new Error('Adaugă o fotografie sau un text înainte de publicare.');
  }
  let imagePath: string | null = null;

  if (asset) {
    // Normalize HEIC and other phone formats to JPEG so photos display
    // consistently on both iPhone and Android.
    const normalized = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: asset.width > 0 ? Math.min(asset.width, 2048) : 2048 } }],
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.84,
      },
    );
    const response = await fetch(normalized.uri);
    if (!response.ok) throw new Error('Fotografia nu a putut fi citită.');
    const file = await response.arrayBuffer();
    if (file.byteLength > 10 * 1024 * 1024) {
      throw new Error('Fotografia optimizată depășește limita de 10 MB.');
    }
    imagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;

    const { error: uploadError } = await c.storage
      .from('faist-photos')
      .upload(imagePath, file, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });
    if (uploadError) throw uploadError;
  }

  const { error } = await c.from('posts').insert({
    author_id: userId,
    body: body.trim().slice(0, 5000),
    image_path: imagePath,
    visibility,
  });

  if (error) {
    if (imagePath) await c.storage.from('faist-photos').remove([imagePath]);
    throw error;
  }
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  const c = client();
  if (liked) {
    const { error } = await c
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await c
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function toggleFollow(targetUserId: string, userId: string, following: boolean) {
  if (targetUserId === userId) return;
  const c = client();
  if (following) {
    const { error } = await c.from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetUserId);
    if (error) throw error;
  } else {
    const { error } = await c.from('follows')
      .insert({ follower_id: userId, following_id: targetUserId });
    if (error) throw error;
  }
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const c = client();
  const { data: rows, error } = await c
    .from('post_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];
  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const { data: profiles, error: profileError } = await c
    .from('profiles')
    .select('id, full_name')
    .in('id', authorIds);
  if (profileError) throw profileError;
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return rows.map((row) => ({
    ...(row as Comment),
    author_name: names.get(row.author_id) ?? 'Utilizator FAIST',
  }));
}

export async function addComment(postId: string, userId: string, body: string) {
  if (!body.trim()) throw new Error('Comentariul nu poate fi gol.');
  const { error } = await client().from('post_comments').insert({
    post_id: postId,
    author_id: userId,
    body: body.trim().slice(0, 3000),
  });
  if (error) throw error;
}

export async function startConversation(username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  if (!validateUsername(normalizedUsername)) {
    throw new Error('Introdu un username valid.');
  }

  const { data, error } = await client().rpc('create_faist_direct_conversation', {
    p_target_username: normalizedUsername,
  });
  if (error) throw error;
  if (typeof data !== 'string') {
    throw new Error('Conversația nu a putut fi creată.');
  }
  return data;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const c = client();
  const { data: memberships, error: membershipError } = await c
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);
  if (membershipError) throw membershipError;
  const ids = [...new Set((memberships ?? []).map((m) => m.conversation_id))];
  if (!ids.length) return [];

  const [{ data: members, error: membersError }, { data: messages, error: messagesError }] =
    await Promise.all([
      c.from('conversation_members').select('conversation_id, user_id').in('conversation_id', ids),
      c.from('direct_messages').select('conversation_id, body, created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(100),
    ]);
  if (membersError) throw membersError;
  if (messagesError) throw messagesError;

  const otherIds = [...new Set((members ?? []).filter((m) => m.user_id !== userId).map((m) => m.user_id))];
  const { data: profiles, error: profilesError } = await c
    .from('profiles')
    .select('id, username, full_name')
    .in('id', otherIds);
  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return ids.map((id) => {
    const otherId = (members ?? []).find((m) => m.conversation_id === id && m.user_id !== userId)?.user_id ?? '';
    const profile = profileMap.get(otherId);
    const lastMessage = (messages ?? []).find((m) => m.conversation_id === id);
    return {
      id,
      other_user_id: otherId,
      other_username: profile?.username ?? 'utilizator',
      other_name: profile?.full_name ?? 'Conversație',
      last_message: lastMessage?.body ?? 'Conversație nouă',
    };
  });
}

export async function fetchMessages(conversationId: string): Promise<DirectMessage[]> {
  const { data, error } = await client()
    .from('direct_messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as DirectMessage[];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
) {
  if (!body.trim()) throw new Error('Mesajul nu poate fi gol.');
  const { error } = await client().from('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body: body.trim().slice(0, 5000),
  });
  if (error) throw error;
}
