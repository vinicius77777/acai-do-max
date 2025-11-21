import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import EstoqueList from "./pages/EstoqueList";
import PedidosList from "./pages/PedidosList";
import LucroList from "./pages/LucroList";
import Menu from "./components/Menu";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 p-6">
        <Menu />

        <Routes>
          <Route path="/" element={<Navigate to="/estoque" replace />} />
          <Route path="/estoque" element={<EstoqueList />} />
          <Route path="/pedidos" element={<PedidosList />} />
          <Route path="/lucro" element={<LucroList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
