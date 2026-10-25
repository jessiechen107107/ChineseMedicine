import AsyncStorage from '@react-native-async-storage/async-storage';

// 本機帳號系統：帳號只存在這支手機上，不需要任何後端，也不會因為閒置而被停用。
// 注意：這是展示用的本機登入，密碼只做簡單雜湊，不是正式的安全機制。

export interface LocalUser {
  name: string;
  email: string;
  createdAt: string;
}

interface StoredUser extends LocalUser {
  passwordHash: string;
}

const USERS_KEY = '@auth_users';
const SESSION_KEY = '@auth_session';

export const DEMO_USER: LocalUser = {
  name: 'Demo User',
  email: 'demo@yuan.app',
  createdAt: new Date(0).toISOString(),
};

// FNV-1a，避免把明碼密碼直接寫進 AsyncStorage
const hashPassword = (password: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < password.length; i++) {
    hash ^= password.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

class AuthService {
  private async loadUsers(): Promise<Record<string, StoredUser>> {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private async startSession(user: LocalUser): Promise<LocalUser> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  async signUp(name: string, email: string, password: string): Promise<LocalUser> {
    const cleanEmail = normalizeEmail(email);
    if (!name.trim()) throw new Error('Please enter your name.');
    if (!isValidEmail(cleanEmail)) throw new Error('Please enter a valid email address.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const users = await this.loadUsers();
    if (users[cleanEmail]) throw new Error('An account with this email already exists.');

    const user: StoredUser = {
      name: name.trim(),
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    };
    users[cleanEmail] = user;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    const { passwordHash, ...publicUser } = user;
    return this.startSession(publicUser);
  }

  async signIn(email: string, password: string): Promise<LocalUser> {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) throw new Error('Please enter your email and password.');

    const users = await this.loadUsers();
    const user = users[cleanEmail];
    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new Error('Incorrect email or password.');
    }

    const { passwordHash, ...publicUser } = user;
    return this.startSession(publicUser);
  }

  async signInDemo(): Promise<LocalUser> {
    return this.startSession(DEMO_USER);
  }

  async getCurrentUser(): Promise<LocalUser | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error reading session:', error);
      return null;
    }
  }

  async updateName(name: string): Promise<void> {
    const current = await this.getCurrentUser();
    if (!current || !name.trim()) return;
    const updated = { ...current, name: name.trim() };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    const users = await this.loadUsers();
    if (users[current.email]) {
      users[current.email].name = updated.name;
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}

export const authService = new AuthService();
