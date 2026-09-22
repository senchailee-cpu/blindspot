/**
 * AI 추천 사각지대 탐색기 - Google OAuth / 간편로그인 인증 관리자 (AuthManager)
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'blindspot_user_session';
  const DEFAULT_CLIENT_ID = '987654321000-demo.apps.googleusercontent.com'; // 기본 클라이언트 ID 샘플

  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.listeners = [];
      this.clientId = this.getMetaClientId() || DEFAULT_CLIENT_ID;
    }

    /**
     * html meta 태그 또는 global config에서 Client ID 추출
     */
    getMetaClientId() {
      const meta = document.querySelector('meta[name="google-signin-client_id"]');
      return meta ? meta.content : null;
    }

    /**
     * 인증 모듈 초기화 및 세션 복원
     */
    init() {
      this.loadSession();
      this.initGoogleSDK();
      this.renderUI();
    }

    /**
     * Google Identity Services SDK 초기화
     */
    initGoogleSDK() {
      if (typeof window.google !== 'undefined' && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true
          });
        } catch (e) {
          console.warn('[AuthManager] GIS SDK initialize notice:', e);
        }
      } else {
        // SDK가 늦게 로드되는 경우 재시도
        window.addEventListener('load', () => {
          if (typeof window.google !== 'undefined' && window.google.accounts) {
            try {
              window.google.accounts.id.initialize({
                client_id: this.clientId,
                callback: this.handleCredentialResponse.bind(this)
              });
            } catch (err) {
              console.warn('[AuthManager] GIS SDK delayed load notice:', err);
            }
          }
        });
      }
    }

    /**
     * Google 로그인 콜백 핸들러
     * @param {Object} response - { credential: "JWT_TOKEN_STRING" }
     */
    handleCredentialResponse(response) {
      if (!response || !response.credential) {
        console.error('[AuthManager] Invalid credential response');
        return;
      }

      try {
        const payload = this.parseJwt(response.credential);
        const user = {
          id: payload.sub,
          name: payload.name || payload.given_name || '로컬 탐험가',
          email: payload.email,
          picture: payload.picture || 'https://lh3.googleusercontent.com/a/default-user',
          loginType: 'google',
          loginAt: new Date().toISOString()
        };

        this.setSession(user);
        this.showToast(`환영합니다, ${user.name}님! 👋`);
      } catch (err) {
        console.error('[AuthManager] Failed to parse Google token:', err);
        this.showToast('로그인 처리 중 오류가 발생했습니다.', 'error');
      }
    }

    /**
     * 데모/테스트용 빠른 구글 간편로그인 (시뮬레이션 모드)
     */
    loginDemoUser() {
      const demoUser = {
        id: 'google-demo-123456',
        name: '안국 탐험가',
        email: 'explorer@example.com',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        loginType: 'google',
        loginAt: new Date().toISOString()
      };
      this.setSession(demoUser);
      this.showToast(`Google 로그인 성공: ${demoUser.name}님 👋`);
    }

    /**
     * JWT ID Token Payload 해독 (Base64URL 안전 디코딩)
     */
    parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload);
      } catch (e) {
        throw new Error('JWT parsing failed');
      }
    }

    /**
     * 세션 설정 및 저장
     */
    setSession(user) {
      this.currentUser = user;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('[AuthManager] LocalStorage quota error:', e);
      }
      this.notifyListeners();
      this.renderUI();
    }

    /**
     * 세션 불러오기
     */
    loadSession() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.currentUser = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('[AuthManager] Failed to load user session:', e);
        this.currentUser = null;
      }
    }

    /**
     * 로그아웃
     */
    logout() {
      if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      const userName = this.currentUser ? this.currentUser.name : '';
      this.currentUser = null;
      localStorage.removeItem(STORAGE_KEY);
      this.notifyListeners();
      this.renderUI();
      if (userName) {
        this.showToast('로그아웃 되었습니다.');
      }
    }

    /**
     * 로그인 상태 변경 리스너 등록
     */
    onAuthStateChanged(listener) {
      if (typeof listener === 'function') {
        this.listeners.push(listener);
        // 등록 즉시 현재 상태 통지
        listener(this.currentUser);
      }
    }

    notifyListeners() {
      this.listeners.forEach(fn => {
        try {
          fn(this.currentUser);
        } catch (e) {
          console.error('[AuthManager] Error in auth listener:', e);
        }
      });
    }

    /**
     * 구글 로그인 팝업 트리거
     */
    triggerGooglePrompt() {
      if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // SDK 팝업 블록 시 대체 모크 로그인 옵션 안내
            this.loginDemoUser();
          }
        });
      } else {
        // SDK 미로드 시 데모 로그인 실행
        this.loginDemoUser();
      }
    }

    /**
     * 헤더 인증 UI 렌더링
     */
    renderUI() {
      const container = document.getElementById('auth-nav-container');
      if (!container) return;

      const lang = (window.AppManager && window.AppManager.currentLang) || 'ko';

      if (this.currentUser) {
        // 로그인 상태: 프로필 아바타 + 이름 + 로그아웃 드롭다운
        container.innerHTML = `
          <div class="user-profile-pill" id="user-profile-pill" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false" title="${this.currentUser.email}">
            <img src="${this.currentUser.picture}" alt="${this.currentUser.name}" class="user-avatar" onerror="this.src='https://lh3.googleusercontent.com/a/default-user'">
            <span class="user-name">${this.currentUser.name}</span>
            <button type="button" class="btn-logout" id="btn-logout" title="로그아웃" onclick="event.stopPropagation(); window.AuthManager.logout();">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        `;
      } else {
        // 비로그인 상태: 구글 간편로그인 버튼
        const loginText = {
          ko: 'Google 로그인',
          en: 'Google Sign-In',
          ja: 'Google ログイン',
          zh: 'Google 登录'
        }[lang] || 'Google 로그인';

        container.innerHTML = `
          <button type="button" class="google-login-btn" id="btn-google-login" onclick="window.AuthManager.triggerGooglePrompt()" title="구글 계정으로 간편로그인">
            <svg class="google-icon" width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.39 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.61 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>${loginText}</span>
          </button>
        `;
      }
    }

    /**
     * 토스트 메시지 출력 유틸리티
     */
    showToast(message, type = 'info') {
      let toast = document.getElementById('auth-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'auth-toast';
        toast.className = 'auth-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.dataset.type = type;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  // 전역 인스턴스 등록
  window.AuthManager = new AuthManager();
})();
