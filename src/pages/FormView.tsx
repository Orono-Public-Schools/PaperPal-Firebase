import { useParams } from "react-router"
import AppLayout from "@/components/layout/AppLayout"

export default function FormView() {
  const { type, id } = useParams<{ type: string; id: string }>()
  return (
    <AppLayout>
      <h1 className="text-2xl font-bold" style={{ color: "#1d2a5d" }}>
        Form View
      </h1>
      <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
        Type: {type} · ID: {id}
      </p>
    </AppLayout>
  )
}
