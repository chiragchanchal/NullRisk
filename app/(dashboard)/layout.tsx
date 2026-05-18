import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BonusModal } from '@/components/ui/bonus-modal'
import { BottomNav } from '@/components/layout/bottom-nav'
import { MarginCallModal } from '@/components/ui/margin-call-modal'
import { SettingsListener } from '@/components/layout/settings-listener'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 relative pb-16 md:pb-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
        <BonusModal />
        <MarginCallModal />
        <BottomNav />
        <SettingsListener />
      </div>
    </div>
  )
}

