import { GameProvider } from "@/lib/game/store"
import { DemoSwitcher } from "@/components/game/demo-switcher"
import { GameStage } from "@/components/game/game-stage"

export default function Page() {
  return (
    <GameProvider>
      <main className="min-h-dvh bg-background text-foreground">
        <DemoSwitcher />
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          <GameStage />
        </div>
      </main>
    </GameProvider>
  )
}
