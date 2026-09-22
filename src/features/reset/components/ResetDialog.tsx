import { useState } from "react"
import { Button, Dialog } from "../../../shared/ui"
import { useReset } from "../../../shared/store/useReset"
import { useToast } from "../../../shared/store/useToast"

export function ResetDialog() {
  const { open, runner, setOpen } = useReset()
  const [running, setRunning] = useState(false)

  const start = async () => {
    if (running) return
    setRunning(true)
    try {
      await runner?.()
      setOpen(false)
      useToast.getState().show("Everything's back to defaults.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Start over"
      footer={
        <>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={running || !runner} onClick={() => void start()}>
            Start over
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-normal text-ash">
        Clears your tracks, size, background and video name, and goes back to the default skin.
        Your saved skins stay. This can't be undone.
      </p>
    </Dialog>
  )
}
