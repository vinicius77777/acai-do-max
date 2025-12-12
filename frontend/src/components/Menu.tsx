import { Link } from "react-router-dom";
import "../styles/menu.css";

export default function Menu() {
  return (
    <nav className="menu">
  <img src="/images/Logo-Photoroom.png" className="logo" />

  <div className="menu-center">
    <Link to="/estoque" className="menu-link">📦 Estoque</Link>
    <Link to="/pedidos" className="menu-link">🧾 Pedidos</Link>
    <Link to="/lucro" className="menu-link">📈 Lucro</Link>
  </div>

  <div></div> {/* coluna vazia só pra alinhar */}
</nav>

  );
}
