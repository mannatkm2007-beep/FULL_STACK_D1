import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import bcrypt from "bcryptjs";
import { db } from "../firebase";

// Login page: checks the email + password against the Firestore "users" collection.
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Find the user document with this email
      const q = query(
        collection(db, "users"),
        where("email", "==", email.trim().toLowerCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("wrong");
        return;
      }

      // 2. Compare the typed password with the stored bcrypt hash
      const user = snapshot.docs[0].data();
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        setError("wrong");
        return;
      }

      // 3. Correct details -> redirect to the home page
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth__box">
        <div className="auth__topright">
          <Link to="/signup" className="auth__signup-btn">Sign up</Link>
        </div>

        <form onSubmit={handleSubmit} className="auth__form">
          <label htmlFor="email">Your email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Your password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error === "wrong" && (
            <p className="auth__error">
              Incorrect email or password. Please try again, or{" "}
              <Link to="/signup">sign up for a free account</Link>.
            </p>
          )}
          {error === "server" && (
            <p className="auth__error">Something went wrong. Please try again.</p>
          )}

          <button type="submit" className="auth__submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Login;