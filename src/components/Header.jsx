import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Header matches the wireframe: DEV@Deakin (links home), search bar, Post, Login.
// Post opens the New Post page (Task C1). Pricing/Login/Logout added in Task D1. Search will be implemented in a future task.
function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        DEV@Deakin
      </Link>

      <div className="header__search">
        <Search size={18} />
        <input type="text" placeholder="Search..." />
      </div>

      <nav className="header__actions">
        <Link to="/post">Post</Link>
        <Link to="/pricing">Pricing</Link>
        {user ? (
          <>
            <span className="header__user">
              Hi, {user.firstName}
              {user.plan === "paid" && <span className="badge badge--paid">Premium</span>}
            </span>
            <button type="button" className="header__logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Header;