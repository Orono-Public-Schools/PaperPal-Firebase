import { useParams } from "react-router"

export default function FormView() {
  const { type, id } = useParams<{ type: string; id: string }>()
  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold">Form View</h1>
      <p className="text-muted-foreground mt-2">
        Type: {type} · ID: {id}
      </p>
    </div>
  )
}
