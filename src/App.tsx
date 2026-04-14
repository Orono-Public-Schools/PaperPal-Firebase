import { BrowserRouter, Route, Routes } from "react-router"
import Dashboard from "@/pages/Dashboard"
import CheckRequest from "@/pages/CheckRequest"
import MileageReimbursement from "@/pages/MileageReimbursement"
import TravelReimbursement from "@/pages/TravelReimbursement"
import FormView from "@/pages/FormView"
import Admin from "@/pages/Admin"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/forms/check" element={<CheckRequest />} />
        <Route path="/forms/mileage" element={<MileageReimbursement />} />
        <Route path="/forms/travel" element={<TravelReimbursement />} />
        <Route path="/forms/:type/:id" element={<FormView />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
