import { Link } from "react-router-dom";
import { Search } from "lucide-react";

// Header matches the wireframe: DEV@Deakin (links home), search bar, Post, Login.
// Post opens the New Post page (Task C1). Search will be implemented in a future task.
function Header() {
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
        <Link to="/login">Login</Link>
      </nav>
    </header>
  );
}

export default Header;