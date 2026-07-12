import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useAuth } from "@/auth/AuthContext";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNote(null);
    const { error } = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    if (mode === "up") {
      setNote("Аккаунт создан. Если требуется подтверждение — проверьте почту, затем войдите.");
      setMode("in");
      return;
    }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <h3>{mode === "in" ? "Вход" : "Регистрация"}</h3>
        <p className="desc">
          Войдите, чтобы синхронизировать прогресс между устройствами. Без входа он
          сохраняется локально в этом браузере.
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Почта</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {note && <p className="info-banner">{note}</p>}

          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? "…" : mode === "in" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <div className="form-switch">
          {mode === "in" ? (
            <>
              Нет аккаунта?{" "}
              <button onClick={() => setMode("up")}>Зарегистрироваться</button>
            </>
          ) : (
            <>
              Уже есть аккаунт? <button onClick={() => setMode("in")}>Войти</button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
