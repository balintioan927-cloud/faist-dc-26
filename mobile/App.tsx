import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import {
  addComment,
  createPost,
  fetchComments,
  fetchConversations,
  fetchFeed,
  fetchMessages,
  getMyProfile,
  sendMessage,
  signIn,
  signOut,
  signUp,
  startConversation,
  toggleLike,
  toggleFollow,
  updateMyProfile,
  validateStrongPassword,
  validateUsername,
  type Comment,
  type Conversation,
  type DirectMessage,
  type FeedPost,
  type Profile,
  type Visibility,
} from './src/lib/api';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';

type Tab = 'feed' | 'create' | 'messages' | 'profile';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [newChatUsername, setNewChatUsername] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    }).catch(() => setCheckingSession(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setFeed([]);
      setProfile(null);
      return;
    }
    loadProfile();
    loadFeed();
  }, [session?.user.id]);

  useEffect(() => {
    if (session && tab === 'feed') loadFeed();
    if (session && tab === 'messages') loadConversationList();
  }, [tab, session?.user.id]);

  useEffect(() => {
    if (selectedConversation) loadConversationMessages(selectedConversation);
  }, [selectedConversation]);

  async function loadFeed() {
    if (!session) return;
    try {
      setFeed(await fetchFeed(session.user.id));
    } catch (error) {
      showError(error);
    }
  }

  async function loadProfile() {
    if (!session) return;
    try {
      const result = await getMyProfile(session.user.id);
      setProfile(result);
      setProfileName(result.full_name ?? '');
      setProfileBio(result.bio ?? '');
    } catch (error) {
      showError(error);
    }
  }

  async function loadConversationList() {
    if (!session) return;
    try {
      const rows = await fetchConversations(session.user.id);
      setConversations(rows);
      if (!selectedConversation && rows.length) setSelectedConversation(rows[0].id);
    } catch (error) {
      showError(error);
    }
  }

  async function loadConversationMessages(id: string) {
    try {
      setMessages(await fetchMessages(id));
    } catch (error) {
      showError(error);
    }
  }

  function showError(error: unknown) {
    const message = error instanceof Error ? error.message : 'A apărut o eroare.';
    Alert.alert('FAIST DC 26', message);
  }

  async function handleAuth() {
    if (!email.trim() || !password) {
      Alert.alert('Completează datele', 'Emailul și parola sunt obligatorii.');
      return;
    }
    setBusy(true);
    try {
      if (authMode === 'register') {
        const passwordProblem = validateStrongPassword(password);
        if (passwordProblem) throw new Error(passwordProblem);
        if (!validateUsername(username.trim().toLowerCase())) {
          throw new Error('Username-ul trebuie să aibă 3–30 caractere: litere mici, cifre, punct, cratimă sau underscore.');
        }
        if (!fullName.trim()) throw new Error('Introdu numele tău.');
        const { data, error } = await signUp(email, password, username, fullName);
        if (error) throw error;
        if (!data.session) {
          Alert.alert('Verifică emailul', 'Ți-am trimis un mesaj de confirmare. După confirmare, intră în cont.');
          setAuthMode('login');
        } else {
          Alert.alert('Cont creat', 'Bine ai venit în FAIST DC 26!');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permisiune necesară', 'Permite accesul la fotografii pentru a publica o imagine.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function handleCreatePost() {
    if (!session) return;
    if (!caption.trim() && !photo) {
      Alert.alert('Postare goală', 'Adaugă o fotografie sau un text.');
      return;
    }
    setBusy(true);
    try {
      await createPost(session.user.id, caption, visibility, photo);
      setCaption('');
      setPhoto(null);
      setVisibility('public');
      setTab('feed');
      await loadFeed();
      Alert.alert('Publicat', 'Postarea a fost salvată în FAIST DC 26.');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleLike(post: FeedPost) {
    if (!session) return;
    try {
      await toggleLike(post.id, session.user.id, post.liked_by_me);
      await loadFeed();
    } catch (error) {
      showError(error);
    }
  }

  async function handleFollow(post: FeedPost) {
    if (!session || post.author_id === session.user.id) return;
    try {
      await toggleFollow(post.author_id, session.user.id, post.is_following_author);
      await loadFeed();
    } catch (error) {
      showError(error);
    }
  }

  async function handleExpandComments(postId: string) {
    if (expandedPost === postId) {
      setExpandedPost(null);
      setComments([]);
      return;
    }
    try {
      setComments(await fetchComments(postId));
      setExpandedPost(postId);
    } catch (error) {
      showError(error);
    }
  }

  async function handleAddComment(postId: string) {
    if (!session || !commentDraft.trim()) return;
    try {
      await addComment(postId, session.user.id, commentDraft);
      setCommentDraft('');
      setComments(await fetchComments(postId));
    } catch (error) {
      showError(error);
    }
  }

  async function handleStartConversation() {
    if (!session || !newChatUsername.trim()) return;
    setBusy(true);
    try {
      const id = await startConversation(newChatUsername, session.user.id);
      setNewChatUsername('');
      await loadConversationList();
      setSelectedConversation(id);
      await loadConversationMessages(id);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage() {
    if (!session || !selectedConversation || !messageDraft.trim()) return;
    try {
      await sendMessage(selectedConversation, session.user.id, messageDraft);
      setMessageDraft('');
      await loadConversationMessages(selectedConversation);
      await loadConversationList();
    } catch (error) {
      showError(error);
    }
  }

  async function handleSaveProfile() {
    if (!session) return;
    setBusy(true);
    try {
      await updateMyProfile(session.user.id, profileName, profileBio);
      await loadProfile();
      Alert.alert('Profil actualizat', 'Modificările au fost salvate.');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await signOut();
      if (error) throw error;
      setSelectedConversation(null);
      setMessages([]);
      setTab('feed');
    } catch (error) {
      showError(error);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.centerPage}>
          <Brand />
          <Text style={styles.title}>Conectarea nu este configurată</Text>
          <Text style={styles.muted}>
            Copiază mobile/.env.example în mobile/.env și completează URL-ul proiectului Supabase FAIST DC 26 și cheia publicabilă. Nu adăuga niciodată cheia service_role în aplicație.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.centerPage}><Brand /><ActivityIndicator color={colors.blue} /></View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.authWrap} keyboardShouldPersistTaps="handled">
            <Brand />
            <Text style={styles.subtitle}>Your social world</Text>
            <View style={styles.card}>
              <View style={styles.segment}>
                <Pressable onPress={() => setAuthMode('login')} style={[styles.segmentButton, authMode === 'login' && styles.segmentSelected]}>
                  <Text style={styles.text}>Autentificare</Text>
                </Pressable>
                <Pressable onPress={() => setAuthMode('register')} style={[styles.segmentButton, authMode === 'register' && styles.segmentSelected]}>
                  <Text style={styles.text}>Creează cont</Text>
                </Pressable>
              </View>
              {authMode === 'register' && (
                <>
                  <Field label="Nume complet" value={fullName} onChangeText={setFullName} placeholder="Numele tău" />
                  <Field label="Username" value={username} onChangeText={setUsername} placeholder="ex. david.gaeris" autoCapitalize="none" />
                </>
              )}
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="email@exemplu.ro" keyboardType="email-address" autoCapitalize="none" />
              <Field label="Parolă" value={password} onChangeText={setPassword} placeholder={authMode === 'register' ? 'Minimum 12 caractere' : 'Parola contului'} secureTextEntry />
              {authMode === 'register' && (
                <Text style={styles.hint}>Minimum 12 caractere, cu literă mare, literă mică, cifră și simbol.</Text>
              )}
              <PrimaryButton title={authMode === 'login' ? 'Intră în cont' : 'Creează cont'} onPress={handleAuth} busy={busy} />
            </View>
            <Text style={styles.hint}>Înregistrarea este deschisă tuturor. Adresa de email trebuie confirmată dacă verificarea emailului este activată în Supabase.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Brand compact />
        <Text style={styles.headerUser}>{profile?.full_name || 'FAIST member'}</Text>
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {tab === 'feed' && (
          <>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.title}>Feed</Text>
                <Text style={styles.muted}>Momente din comunitatea FAIST</Text>
              </View>
              <Pressable onPress={loadFeed}><Text style={styles.link}>Reîncarcă</Text></Pressable>
            </View>
            {feed.length === 0 ? <Empty text="Nu există postări vizibile încă. Fii primul care publică." /> : feed.map((post) => (
              <View key={post.id} style={styles.card}>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(post.author.full_name || 'F')[0].toUpperCase()}</Text></View>
                  <View style={styles.flex}>
                    <Text style={styles.textStrong}>{post.author.full_name}</Text>
                    <Text style={styles.hint}>@{post.author.username} · {new Date(post.created_at).toLocaleString('ro-RO')}</Text>
                  </View>
                  {post.author_id !== session.user.id && (
                    <Pressable onPress={() => handleFollow(post)}>
                      <Text style={styles.link}>{post.is_following_author ? 'Urmărești' : 'Urmărește'}</Text>
                    </Pressable>
                  )}
                </View>
                {!!post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />}
                {!!post.body && <Text style={styles.body}>{post.body}</Text>}
                <View style={styles.actionRow}>
                  <Pressable onPress={() => handleLike(post)}>
                    <Text style={[styles.link, post.liked_by_me && styles.liked]}>{post.liked_by_me ? '✓ Confirmat' : '♡ Confirmă'} · {post.likes_count}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleExpandComments(post.id)}>
                    <Text style={styles.link}>{expandedPost === post.id ? 'Ascunde comentariile' : 'Comentarii'}</Text>
                  </Pressable>
                </View>
                {expandedPost === post.id && (
                  <View style={styles.commentsBox}>
                    {comments.map((comment) => (
                      <View key={comment.id} style={styles.comment}>
                        <Text style={styles.textStrong}>{comment.author_name}</Text>
                        <Text style={styles.body}>{comment.body}</Text>
                      </View>
                    ))}
                    <Field label="Adaugă un comentariu" value={commentDraft} onChangeText={setCommentDraft} placeholder="Scrie ceva..." />
                    <PrimaryButton title="Publică comentariul" onPress={() => handleAddComment(post.id)} />
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'create' && (
          <>
            <Text style={styles.title}>Postare nouă</Text>
            <Text style={styles.muted}>Publică o fotografie sau un mesaj.</Text>
            <View style={styles.card}>
              <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
                <Text style={styles.link}>{photo ? 'Schimbă fotografia' : '＋ Alege fotografie'}</Text>
              </Pressable>
              {photo && <Image source={{ uri: photo.uri }} style={styles.postImage} resizeMode="cover" />}
              <Field label="Descriere" value={caption} onChangeText={setCaption} placeholder="Ce vrei să împărtășești?" multiline />
              <Text style={styles.label}>Cine poate vedea postarea?</Text>
              <View style={styles.segment}>
                {(['public', 'followers', 'private'] as Visibility[]).map((value) => (
                  <Pressable key={value} onPress={() => setVisibility(value)} style={[styles.segmentButton, visibility === value && styles.segmentSelected]}>
                    <Text style={styles.text}>{value === 'public' ? 'Public' : value === 'followers' ? 'Urmăritori' : 'Doar eu'}</Text>
                  </Pressable>
                ))}
              </View>
              <PrimaryButton title="Publică" onPress={handleCreatePost} busy={busy} />
            </View>
          </>
        )}

        {tab === 'messages' && (
          <>
            <Text style={styles.title}>Mesaje private</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Începe o conversație după username</Text>
              <Field label="Username" value={newChatUsername} onChangeText={setNewChatUsername} placeholder="username" autoCapitalize="none" />
              <PrimaryButton title="Deschide conversația" onPress={handleStartConversation} busy={busy} />
            </View>
            {conversations.map((conversation) => (
              <Pressable key={conversation.id} onPress={() => setSelectedConversation(conversation.id)} style={[styles.conversation, selectedConversation === conversation.id && styles.conversationSelected]}>
                <Text style={styles.textStrong}>{conversation.other_name} · @{conversation.other_username}</Text>
                <Text style={styles.hint} numberOfLines={1}>{conversation.last_message}</Text>
              </Pressable>
            ))}
            {selectedConversation && (
              <View style={styles.card}>
                <Text style={styles.label}>Conversație</Text>
                {messages.map((message) => (
                  <View key={message.id} style={[styles.messageBubble, message.sender_id === session.user.id && styles.myMessage]}>
                    <Text style={styles.text}>{message.body}</Text>
                    <Text style={styles.hint}>{message.sender_id === session.user.id ? 'Tu' : 'Celălalt utilizator'} · {new Date(message.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                ))}
                <Field label="Mesaj" value={messageDraft} onChangeText={setMessageDraft} placeholder="Scrie un mesaj..." />
                <PrimaryButton title="Trimite" onPress={handleSendMessage} />
              </View>
            )}
            {conversations.length === 0 && <Empty text="Nu ai conversații încă. Caută un username pentru a începe." />}
          </>
        )}

        {tab === 'profile' && (
          <>
            <Text style={styles.title}>Profilul meu</Text>
            <View style={styles.card}>
              <View style={styles.profileAvatar}><Text style={styles.avatarText}>{(profile?.full_name || 'F')[0].toUpperCase()}</Text></View>
              <Text style={styles.textStrongCenter}>{profile?.full_name}</Text>
              <Text style={styles.mutedCenter}>@{profile?.username}</Text>
              <Field label="Nume complet" value={profileName} onChangeText={setProfileName} placeholder="Numele tău" />
              <Field label="Descriere" value={profileBio} onChangeText={setProfileBio} placeholder="Spune ceva despre tine..." multiline />
              <PrimaryButton title="Salvează profilul" onPress={handleSaveProfile} busy={busy} />
            </View>
            <View style={styles.card}>
              <Text style={styles.textStrong}>Securitate cont</Text>
              <Text style={styles.hint}>Sesiunea este păstrată în stocarea securizată a dispozitivului.</Text>
              <Pressable onPress={handleSignOut} style={styles.signOut}><Text style={styles.dangerText}>Deconectare</Text></Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TabButton title="Feed" active={tab === 'feed'} onPress={() => setTab('feed')} />
        <TabButton title="Postează" active={tab === 'create'} onPress={() => setTab('create')} />
        <TabButton title="Mesaje" active={tab === 'messages'} onPress={() => setTab('messages')} />
        <TabButton title="Profil" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>
    </SafeAreaView>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Text style={[styles.brand, compact && styles.brandCompact]}>
      FAIST <Text style={styles.brandBlue}>DC 26</Text>
    </Text>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize={props.autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        multiline={props.multiline}
        style={[styles.input, props.multiline && styles.multiline]}
      />
    </View>
  );
}

function PrimaryButton({ title, onPress, busy = false }: { title: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable disabled={busy} onPress={onPress} style={[styles.primary, busy && styles.disabled]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}
    </Pressable>
  );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return <View style={styles.empty}><Text style={styles.mutedCenter}>{text}</Text></View>;
}

const colors = {
  bg: '#080D18',
  panel: '#101A2C',
  panel2: '#17243A',
  line: '#263A59',
  blue: '#367DFA',
  blueLight: '#8DB8FF',
  text: '#F5F8FF',
  muted: '#91A0B9',
  green: '#80E0B2',
  red: '#FF9DAA',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  centerPage: { flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 18 },
  authWrap: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  brand: { color: colors.text, fontSize: 36, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  brandCompact: { fontSize: 19, textAlign: 'left' },
  brandBlue: { color: colors.blueLight },
  subtitle: { color: colors.muted, textAlign: 'center', letterSpacing: 4, marginTop: 8, marginBottom: 26, fontSize: 11 },
  header: { minHeight: 58, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerUser: { color: colors.muted, fontSize: 12, maxWidth: '50%' },
  page: { padding: 16, paddingBottom: 26 },
  card: { backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 16, marginVertical: 9, gap: 10 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', marginBottom: 5 },
  subtitleText: { color: colors.muted, fontSize: 13 },
  text: { color: colors.text, fontSize: 14 },
  textStrong: { color: colors.text, fontSize: 14, fontWeight: '800' },
  textStrongCenter: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  mutedCenter: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  label: { color: colors.blueLight, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  fieldWrap: { gap: 4, marginVertical: 4 },
  input: { minHeight: 48, color: colors.text, backgroundColor: '#0B1423', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  segment: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 8 },
  segmentButton: { flex: 1, minWidth: 90, paddingVertical: 11, paddingHorizontal: 9, backgroundColor: colors.panel2, borderColor: colors.line, borderWidth: 1, borderRadius: 10, alignItems: 'center' },
  segmentSelected: { backgroundColor: '#1D3B68', borderColor: colors.blue },
  primary: { backgroundColor: colors.blue, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.55 },
  mutedSmall: { color: colors.muted, fontSize: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  link: { color: colors.blueLight, fontSize: 13, fontWeight: '800' },
  liked: { color: colors.green },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#234C85', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  visibility: { color: colors.muted, fontSize: 10 },
  postImage: { width: '100%', height: 270, borderRadius: 13, backgroundColor: colors.panel2, marginTop: 8 },
  body: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 22, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 10 },
  commentsBox: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, marginTop: 8 },
  comment: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  photoPicker: { minHeight: 56, borderWidth: 1, borderColor: colors.blue, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10213B' },
  conversation: { padding: 14, backgroundColor: colors.panel, borderRadius: 12, borderWidth: 1, borderColor: colors.line, marginVertical: 5, gap: 4 },
  conversationSelected: { borderColor: colors.blue, backgroundColor: '#142947' },
  messageBubble: { backgroundColor: colors.panel2, padding: 12, borderRadius: 12, marginVertical: 5, maxWidth: '88%', alignSelf: 'flex-start' },
  myMessage: { backgroundColor: '#1D477F', alignSelf: 'flex-end' },
  profileAvatar: { width: 82, height: 82, borderRadius: 44, backgroundColor: colors.blue, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  signOut: { minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#351C2A', borderRadius: 10, marginTop: 10 },
  dangerText: { color: colors.red, fontWeight: '800' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#0B1423', paddingHorizontal: 5, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8 },
  tabButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1A3153' },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: colors.blueLight },
  empty: { padding: 30, alignItems: 'center' },
});
