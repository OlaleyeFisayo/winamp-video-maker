import { Component, type ReactNode } from "react"
import { Button } from "../../../shared/ui"

export default class EditorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
 state = { failed: false }

 static getDerivedStateFromError() {
  return { failed: true }
 }

 render() {
  if (this.state.failed) {
   return (
    <section className="grid place-content-center gap-4 bg-graphite p-8 text-ash">
     <p role="alert">The editor couldn't load. Check your connection and reload.</p>
     <Button onClick={() => window.location.reload()}>Reload editor</Button>
    </section>
   )
  }
  return this.props.children
 }
}