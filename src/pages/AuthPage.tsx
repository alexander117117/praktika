import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { chooseGuestMode, useAuth } from "@/auth/AuthContext";

const YandexIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
    <text
      x="12"
      y="16.8"
      textAnchor="middle"
      fontSize="13.5"
      fontWeight="700"
      fill="#fff"
      fontFamily="Arial, Helvetica, sans-serif"
    >
      Я
    </text>
  </svg>
);

const TESTIMONIALS = [
  {
    initial: "М",
    name: "Мария",
    handle: "3 курс, лечебное дело",
    text: "За две недели закрыла все вопросы к практике. Карточки — то, что нужно.",
  },
  {
    initial: "А",
    name: "Артём",
    handle: "ординатура",
    text: "Прогресс синхронизируется между телефоном и ноутом — повторяю в метро.",
  },
];

export function AuthPage() {
  const { enabled, user, loading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or Supabase not configured) — the screen is pointless.
  if (!loading && (user || !enabled)) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    const { error } =
      mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/", { replace: true });
  };

  const onReset = async () => {
    setError(null);
    setNote(null);
    if (!email) {
      setError("Введите почту выше — пришлём на неё ссылку для входа.");
      return;
    }
    const { error } = await resetPassword(email);
    if (error) setError(error);
    else setNote("Письмо отправлено. Откройте ссылку из него, чтобы войти.");
  };

  const onYandex = () => {
    setError(null);
    setNote(
      "Вход через Яндекс скоро подключим. Пока войдите по почте и паролю — это займёт минуту.",
    );
  };

  return (
    <div className="auth-page">
      <section className="auth-form-col">
        <div className="auth-card">
          <h1 className="auth-title a-el a-d1">
            {mode === "in" ? "С возвращением" : "Создать аккаунт"}
          </h1>
          <p className="auth-sub a-el a-d2">
            {mode === "in"
              ? "Войдите, чтобы прогресс синхронизировался между устройствами."
              : "Аккаунт нужен только для синхронизации прогресса между устройствами."}
          </p>

          <form onSubmit={submit}>
            <div className="g-field a-el a-d3">
              <label htmlFor="auth-email">Почта</label>
              <div className="g-input">
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="g-field a-el a-d4">
              <label htmlFor="auth-password">Пароль</label>
              <div className="g-input">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  placeholder={mode === "in" ? "Ваш пароль" : "Минимум 6 символов"}
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="g-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === "in" && (
              <div className="auth-row a-el a-d5">
                <span />
                <button type="button" className="auth-link" onClick={() => void onReset()}>
                  Забыли пароль?
                </button>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}
            {note && <p className="info-banner">{note}</p>}

            <button className="auth-submit a-el a-d6" type="submit" disabled={busy}>
              {busy ? "…" : mode === "in" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <div className="auth-divider a-el a-d7">
            <span>или</span>
          </div>

          <button type="button" className="auth-oauth a-el a-d8" onClick={onYandex}>
            <YandexIcon />
            Войти через Яндекс
          </button>

          <p className="auth-switch a-el a-d9">
            {mode === "in" ? (
              <>
                Нет аккаунта?{" "}
                <button className="auth-link" onClick={() => setMode("up")}>
                  Создать аккаунт
                </button>
              </>
            ) : (
              <>
                Уже есть аккаунт?{" "}
                <button className="auth-link" onClick={() => setMode("in")}>
                  Войти
                </button>
              </>
            )}
          </p>

          <p className="auth-guest a-el a-d9">
            <button
              className="auth-link muted"
              onClick={() => {
                chooseGuestMode();
                navigate("/");
              }}
            >
              Продолжить без аккаунта →
            </button>
          </p>
        </div>
      </section>

      <section className="auth-hero">
        <div className="auth-hero-img a-hero" />
        <div className="auth-testimonials">
          {TESTIMONIALS.map((t, i) => (
            <div className={`t-card a-el ${i === 0 ? "a-d8" : "a-d9 t-card-second"}`} key={t.name}>
              <div className="avatar t-avatar">{t.initial}</div>
              <div>
                <div className="t-name">{t.name}</div>
                <div className="t-handle">{t.handle}</div>
                <p className="t-text">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
