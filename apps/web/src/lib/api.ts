import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL!;

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// ========== Refresh lock & queue ==========
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let subscribers: Array<(token: string | null) => void> = [];
let logoutTriggered = false; // 🔑 একবারই logout

function onRefreshed(token: string | null) {
  subscribers.forEach((cb) => cb(token));
  subscribers = [];
}

function enqueue(cb: (token: string | null) => void) {
  subscribers.push(cb);
}

function forceLogout() {
  if (logoutTriggered) return;
  logoutTriggered = true;

  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/login?next=${next}`;
}

// ========== Request interceptor ==========
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? ({} as any);
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ========== Response interceptor ==========
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = err.response?.status;
    const url = original?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    // শুধু 401, retry না করা, auth endpoint না হলে
    if (
      status !== 401 ||
      !original ||
      original._retry ||
      isAuthEndpoint ||
      typeof window === 'undefined'
    ) {
      return Promise.reject(err);
    }

    original._retry = true;

    // 🔑🔑🔑 সবচেয়ে গুরুত্বপূর্ণ অংশ 🔑🔑🔑
    // যদি ইতিমধ্যে refresh চলছে → queue-তে অপেক্ষা করো
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        enqueue((token) => {
          if (!token) {
            // refresh fail → reject (logout ইতিমধ্যে হয়েছে)
            return reject(err);
          }
          original.headers = original.headers ?? ({} as any);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    // প্রথম 401 → refresh শুরু
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // ⚠️ refreshToken নেই → এখানে logout নয়!
        // শুধু queue-তে null পাঠিয়ে reject
        throw new Error('NO_REFRESH_TOKEN');
      }

      const { data } = await axios.post(
        `${baseURL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      onRefreshed(data.accessToken);

      original.headers = original.headers ?? ({} as any);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshErr: any) {
      // refresh fail → সব queued request reject + একবার logout
      onRefreshed(null);

      // ⚠️ শুধু NO_REFRESH_TOKEN হলে logout দরকার নেই?
      // না — refreshToken না থাকলে user আসলে authenticated না,
      // তাই logout করা ঠিক। কিন্তু এটা refresh fail-এর অংশ।
      forceLogout();

      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);
