import { BrowserRouter, Route, Routes } from "react-router"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import CheckRequest from "@/pages/CheckRequest"
import MileageReimbursement from "@/pages/MileageReimbursement"
import TravelReimbursement from "@/pages/TravelReimbursement"
import FormView from "@/pages/FormView"
import Admin from "@/pages/Admin"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/check"
            element={
              <ProtectedRoute>
                <CheckRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/mileage"
            element={
              <ProtectedRoute>
                <MileageReimbursement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/travel"
            element={
              <ProtectedRoute>
                <TravelReimbursement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:type/:id"
            element={
              <ProtectedRoute>
                <FormView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
