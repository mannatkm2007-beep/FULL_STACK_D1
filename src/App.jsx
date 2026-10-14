import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NewPost from "./pages/NewPost";
import "./App.css";

// Header and Footer sit outside <Routes>, so they appear
// identically on every page.
function App() {
  return (
    <div className="app">
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/post" element={<NewPost />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;