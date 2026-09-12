import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Identities from "./pages/Identities";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Policies from "./pages/Policies";
import Resources from "./pages/Resources";
import Assets from "./pages/Assets";
import Security from "./pages/Security";
import Recovery from "./pages/Recovery";
import Audit from "./pages/Audit";
import BankDemo from "./pages/BankDemo";
import AttackDemo from "./pages/AttackDemo";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/portal" element={<BankDemo />} />
        <Route path="/bank" element={<BankDemo />} />
        <Route path="/attack" element={<AttackDemo />} />
        <Route path="/demo" element={<AttackDemo />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/identities" element={<Identities />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/security" element={<Security />} />
        <Route path="/ai-security" element={<Security />} />
        <Route path="/recovery" element={<Recovery />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;