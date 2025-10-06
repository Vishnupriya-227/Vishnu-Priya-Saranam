// frontend/src/components/Layout.jsx
import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <main style={{ padding: "20px" }}>{children}</main>
    </div>
  );
}
