import { Link } from "react-router-dom";
import "../styles/menu.css"; // vamos criar este arquivo

export default function Menu() {
  return (
    <nav className="menu">
      <Link to="/estoque" className="menu-link">
        📦 Estoque
      </Link>
      <Link to="/pedidos" className="menu-link">
        🧾 Pedidos
      </Link>
      <Link to="/lucro" className="menu-link">
        📈 Lucro
      </Link>
    </nav>
  );
}
